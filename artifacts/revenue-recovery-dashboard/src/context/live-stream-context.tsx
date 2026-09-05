import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface IngestedTransaction {
  id: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  amount: number;
  errorCode: string;
  errorDesc: string;
  timestamp: number;
}

interface LiveStreamContextType {
  isStreaming: boolean;
  countdown: number;
  streamCount: number;
  isIngesting: boolean;
  isClearing: boolean;
  lastIngested: IngestedTransaction | null;
  startStream: () => void;
  pauseStream: () => void;
  toggleStream: () => void;
  ingestRandomPayment: () => Promise<void>;
  clearAllRecoveries: () => Promise<void>;
}

const LiveStreamContext = createContext<LiveStreamContextType | null>(null);

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rahul', 'Priya', 'Vikram', 'Sneha', 'Rohan', 'Pooja',
  'Siddharth', 'Meera', 'Kabir', 'Divya', 'Arjun', 'Tanvi', 'Varun', 'Ritu',
  'Deepak', 'Ishaan', 'Aniket', 'Maya', 'Sanjay', 'Shruti', 'Aditya', 'Neha',
  'Kunal', 'Kavita', 'Gaurav', 'Tara', 'Nikhil', 'Simran'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Singh', 'Patel', 'Nair', 'Mehta', 'Joshi', 'Reddy',
  'Rao', 'Gupta', 'Iyer', 'Choudhury', 'Das', 'Banerjee', 'Kapoor', 'Kulkarni',
  'Bhatia', 'Malhotra', 'Deshmukh', 'Menon'
];

const COMPANIES = [
  { name: 'TechCorp Cloud', domain: 'techcorp.in' },
  { name: 'CloudInfra Labs', domain: 'cloudinfra.com' },
  { name: 'DigitalScale Media', domain: 'digitalscale.io' },
  { name: 'RazorScale AI', domain: 'razorscale.tech' },
  { name: 'FinTech Hub Ltd', domain: 'fintechhub.in' },
  { name: 'GrowthPulse Systems', domain: 'growthpulse.co' },
  { name: 'AlphaStream Analytics', domain: 'alphastream.io' },
  { name: 'NextWave Logic', domain: 'nextwave.co' },
  { name: 'DataForge Technologies', domain: 'dataforge.in' },
  { name: 'OmniCloud India', domain: 'omnicloud.tech' },
  { name: 'HyperMetrics Labs', domain: 'hypermetrics.io' },
  { name: 'NexusAI Global', domain: 'nexusai.co' },
  { name: 'PulseLogic Networks', domain: 'pulselogic.in' },
  { name: 'CyberSys Enterprise', domain: 'cybersys.com' },
];

const FAILURE_TEMPLATES = [
  {
    code: 'BANK_TIMEOUT',
    desc: 'Core banking network timeout at issuing bank gateway',
    amounts: [1850000, 2499900, 2999900, 3450000, 4800000],
  },
  {
    code: 'AUTHENTICATION_FAILED_3DS',
    desc: '3D Secure OTP verification window timed out or abandoned',
    amounts: [1299900, 1999900, 3250000, 4500000, 6200000],
  },
  {
    code: 'UPI_COLLECT_REQUEST_EXPIRED',
    desc: 'UPI collect authorization expired on customer mobile app',
    amounts: [499900, 899900, 1499900, 2199900, 2899900],
  },
  {
    code: 'BAD_REQUEST_INSUFFICIENT_FUNDS',
    desc: 'Card issuer declined transaction due to insufficient funds',
    amounts: [799900, 1499900, 2250000, 3100000, 3999900],
  },
  {
    code: 'CARD_LIMIT_EXCEEDED',
    desc: 'Daily credit limit threshold exceeded on corporate card',
    amounts: [3800000, 5200000, 6800000, 7500000, 9200000],
  },
  {
    code: 'EXPIRED_CARD',
    desc: 'Credit card on file expired before subscription billing',
    amounts: [999900, 1999900, 2499900, 2999900],
  },
  {
    code: 'BAD_REQUEST_PAYMENT_DECLINED',
    desc: 'Issuing bank declined card authorization request',
    amounts: [1199900, 1549900, 2399900, 3750000, 4400000],
  },
  {
    code: 'BAD_REQUEST_PAYMENT_CARD_INVALID',
    desc: 'Card details invalid or CVV verification mismatch',
    amounts: [649900, 1250000, 1899900, 2750000],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomPayment() {
  const firstName = pickRandom(FIRST_NAMES);
  const lastName = pickRandom(LAST_NAMES);
  const companyObj = pickRandom(COMPANIES);
  const failure = pickRandom(FAILURE_TEMPLATES);
  const amount = pickRandom(failure.amounts);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const randomPhoneDigits = Math.floor(10000000 + Math.random() * 90000000);
  const randomId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

  const customerId = `cust_${firstName.toLowerCase()}_${lastName.toLowerCase()}_${randomSuffix}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyObj.domain}`;
  const phone = `+9198${randomPhoneDigits}`;

  return {
    id: `pay_sim_${randomId}`,
    customerName: `${firstName} ${lastName}`,
    company: companyObj.name,
    customerId,
    email,
    phone,
    amount,
    errorCode: failure.code,
    errorDesc: failure.desc,
  };
}

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isStreaming, setIsStreaming] = useState(() => {
    try {
      return localStorage.getItem('recoverly_is_streaming') === 'true';
    } catch {
      return false;
    }
  });

  const [countdown, setCountdown] = useState(30);
  const [streamCount, setStreamCount] = useState(0);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [lastIngested, setLastIngested] = useState<IngestedTransaction | null>(null);

  const isIngestingRef = useRef(false);
  const streamCountRef = useRef(0);
  streamCountRef.current = streamCount;

  // Persist streaming state
  useEffect(() => {
    try {
      localStorage.setItem('recoverly_is_streaming', String(isStreaming));
    } catch {
      // ignore storage exceptions
    }
  }, [isStreaming]);

  const ingestRandomPayment = async () => {
    if (isIngestingRef.current) return;
    isIngestingRef.current = true;
    setIsIngesting(true);

    try {
      const payment = generateRandomPayment();

      const res = await fetch('/api/v1/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: payment.id,
                amount: payment.amount,
                currency: 'INR',
                status: 'failed',
                error_code: payment.errorCode,
                error_description: payment.errorDesc,
                customer_id: payment.customerId,
                email: payment.email,
                contact: payment.phone,
              },
            },
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Invalidate all related caches across the application
        void queryClient.invalidateQueries();

        const record: IngestedTransaction = {
          id: payment.id,
          customerName: payment.customerName,
          company: payment.company,
          email: payment.email,
          phone: payment.phone,
          amount: payment.amount,
          errorCode: payment.errorCode,
          errorDesc: payment.errorDesc,
          timestamp: Date.now(),
        };

        setLastIngested(record);
        setStreamCount((prev) => prev + 1);

        toast({
          title: `⚡ New Failed Payment Ingested`,
          description: `${payment.customerName} (${payment.company}) · ₹${(payment.amount / 100).toLocaleString('en-IN')} · ${payment.errorDesc}`,
        });
      } else {
        toast({
          title: 'Webhook Simulation Failed',
          description: data.message || 'Webhook rejected by server.',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Connection Error',
        description: e.message || 'Failed to send webhook.',
      });
    } finally {
      isIngestingRef.current = false;
      setIsIngesting(false);
    }
  };

  const startStream = () => {
    setIsStreaming(true);
    // Ingest the first random event immediately!
    void ingestRandomPayment();
    // Set first timer to ~30-35s
    setCountdown(32);
    toast({
      title: '🟢 Live Traffic Stream Started',
      description: 'Incoming payment failures will now stream continuously across all pages.',
    });
  };

  const pauseStream = () => {
    setIsStreaming(false);
    toast({
      title: '⏸️ Stream Paused',
      description: 'Simulated webhook stream is currently on hold.',
    });
  };

  const toggleStream = () => {
    if (isStreaming) {
      pauseStream();
    } else {
      startStream();
    }
  };

  const clearAllRecoveries = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/v1/recoveries/clear', { method: 'POST' });
      if (res.ok) {
        void queryClient.invalidateQueries();
        setStreamCount(0);
        setLastIngested(null);
        setIsStreaming(false);
        toast({
          title: 'All Recoveries Cleared',
          description: 'Database wiped clean to 0 recovery records.',
        });
      } else {
        toast({ title: 'Error', description: 'Server failed to clear recoveries.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not contact server.' });
    } finally {
      setIsClearing(false);
    }
  };

  // Background timer: runs globally regardless of current page!
  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger the next random failure
          void ingestRandomPayment();

          // Progressive timing:
          // Early in the session: 30-40s
          // As session continues: 45-90s (to mimic realistic transaction flows)
          const currentCount = streamCountRef.current;
          let nextDelay = 30 + Math.floor(Math.random() * 15); // 30-45s
          if (currentCount >= 2 && currentCount < 5) {
            nextDelay = 45 + Math.floor(Math.random() * 25); // 45-70s
          } else if (currentCount >= 5) {
            nextDelay = 60 + Math.floor(Math.random() * 50); // 60-110s (~1-2 min)
          }
          return nextDelay;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStreaming]);

  return (
    <LiveStreamContext.Provider
      value={{
        isStreaming,
        countdown,
        streamCount,
        isIngesting,
        isClearing,
        lastIngested,
        startStream,
        pauseStream,
        toggleStream,
        ingestRandomPayment,
        clearAllRecoveries,
      }}
    >
      {children}
    </LiveStreamContext.Provider>
  );
}

export function useLiveStream() {
  const ctx = useContext(LiveStreamContext);
  if (!ctx) {
    throw new Error('useLiveStream must be used within a LiveStreamProvider');
  }
  return ctx;
}
