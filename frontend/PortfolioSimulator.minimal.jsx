import React, { useState } from 'react';

export default function PortfolioSimulator({ 
  currency = 'USD', 
  lang = 'es'
}) {
  const [test, setTest] = useState('working');

  return (
    <div className="p-4">
      <h1 className="text-white text-2xl">Portfolio Simulator - {test}</h1>
      <p className="text-slate-400">Language: {lang}, Currency: {currency}</p>
      <button 
        onClick={() => setTest('clicked')}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
      >
        Test Button
      </button>
    </div>
  );
}