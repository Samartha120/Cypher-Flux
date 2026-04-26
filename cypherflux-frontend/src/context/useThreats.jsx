import { useContext } from 'react';
import { ThreatContext } from './ThreatContext';

export const useThreats = () => {
  const ctx = useContext(ThreatContext);
  if (!ctx) throw new Error('useThreats must be used within a ThreatProvider');
  return ctx;
};
