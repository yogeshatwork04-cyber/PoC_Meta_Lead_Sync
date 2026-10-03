import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import io from 'socket.io-client';

// Change to your machine's local IP (e.g., 'http://192.168.1.X:5000') if testing on a physical phone via Expo Go
const SERVER_URL = Platform.select({
  android: 'http://10.0.2.2:5000',
  default: 'http://localhost:5000',
});

export default function App() {
  const [leads, setLeads] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Fetch initial leads
    fetch(`${SERVER_URL}/api/leads`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeads(data);
        }
      })
      .catch((err) => console.log('Error fetching leads:', err.message));

    // 2. Setup Socket.IO for real-time lead updates
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to backend socket');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend socket');
      setIsConnected(false);
    });

    // Receive live leads submitted via Meta Lead Testing Tool
    socket.on('new_lead', (newLead) => {
      console.log('New lead received:', newLead);
      setLeads((prev) => {
        const exists = prev.some((l) => l.leadId === newLead.leadId);
        if (exists) return prev;
        return [newLead, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const renderLeadCard = ({ item }) => {
    const formattedTime = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'Just now';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.leadName}>{item.fullName || 'Test Lead'}</Text>
          <Text style={styles.leadTime}>{formattedTime}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{item.email || 'N/A'}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{item.phoneNumber || 'N/A'}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Lead ID:</Text>
          <Text style={styles.code}>{item.leadId}</Text>
        </View>

        {item.formId ? (
          <View style={styles.cardRow}>
            <Text style={styles.label}>Form ID:</Text>
            <Text style={styles.code}>{item.formId}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Meta Lead Ads</Text>
          <Text style={styles.headerSubtitle}>Real-time Leads Stream</Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#22c55e' : '#ef4444' },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => item.leadId}
        renderItem={renderLeadCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Leads Yet</Text>
            <Text style={styles.emptySubtitle}>
              Submit a lead from Meta's Lead Testing Tool to see it appear here live.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  leadTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  value: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500',
  },
  code: {
    fontSize: 12,
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
