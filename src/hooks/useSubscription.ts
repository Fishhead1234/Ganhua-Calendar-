import { useState, useEffect } from 'react';
import { purchaseService, SubscriptionPlan } from '../services/purchaseService';

export function useSubscription() {
  const [isPro, setIsPro] = useState<boolean>(() => purchaseService.isPro());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = purchaseService.subscribe((status) => {
      setIsPro(status);
    });
    return unsubscribe;
  }, []);

  const purchase = async (plan: SubscriptionPlan) => {
    setIsLoading(true);
    try {
      return await purchaseService.purchasePlan(plan);
    } finally {
      setIsLoading(false);
    }
  };

  const restore = async () => {
    setIsLoading(true);
    try {
      return await purchaseService.restorePurchases();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMockPro = () => {
    purchaseService.setProStatus(!isPro);
  };

  return {
    isPro,
    isLoading,
    purchase,
    restore,
    toggleMockPro,
  };
}

