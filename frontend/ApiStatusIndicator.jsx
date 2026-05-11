import React, { useState, useEffect } from 'react';
import { realTimeApi } from './realTimeApi';

export default function ApiStatusIndicator({ lang = 'es' }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const apiStatus = await realTimeApi.checkApiStatus();
        setStatus(apiStatus);
      } catch (error) {
        console.error('Failed to check API status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Check status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>{lang === 'es' ? 'Verificando APIs...' : 'Checking APIs...'}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>{lang === 'es' ? 'Estado desconocido' : 'Unknown status'}</span>
      </div>
    );
  }

  const { apis } = status;
  let statusColor = 'bg-red-500';
  let statusText = lang === 'es' ? 'Solo Yahoo (15min)' : 'Yahoo only (15min)';

  if (apis.alphavantage?.available) {
    statusColor = 'bg-green-500';
    statusText = lang === 'es' 
      ? `Tiempo real (${apis.alphavantage.callsThisMinute}/60)`
      : `Real-time (${apis.alphavantage.callsThisMinute}/60)`;
  } else if (apis.twelvedata?.available) {
    statusColor = 'bg-green-500';
    statusText = lang === 'es'
      ? `Tiempo real (${apis.twelvedata.callsToday}/800)`
      : `Real-time (${apis.twelvedata.callsToday}/800)`;
  } else if (apis.alphavantage?.callsThisMinute >= 60) {
    statusColor = 'bg-yellow-500';
    statusText = lang === 'es' ? 'Límite Alpha Vantage' : 'Alpha Vantage limit';
  } else if (apis.twelvedata?.callsToday >= 800) {
    statusColor = 'bg-yellow-500';
    statusText = lang === 'es' ? 'Límite Twelve Data' : 'Twelve Data limit';
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span>{statusText}</span>
    </div>
  );
}