import { useState, useEffect } from 'react';
import { purchaseService, SubscriptionPlan, AppTier, TrialInfo } from '../services/purchaseService';

export function useSubscription() {
  const [tier, setTierState] = useState<AppTier>(() => purchaseService.getTier());
  const [isPro, setIsPro] = useState<boolean>(() => purchaseService.isPro());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => purchaseService.isAdmin());
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => purchaseService.isAdminAuthenticated());
  const [trialInfo, setTrialInfo] = useState<TrialInfo>(() => purchaseService.getTrialInfo());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    purchaseService.initialize();
    const unsubscribe = purchaseService.subscribe((proVal, tierVal, adminVal, authedVal, trialVal) => {
      setIsPro(proVal);
      setTierState(tierVal);
      setIsAdmin(adminVal);
      setIsAdminAuthed(authedVal);
      setTrialInfo(trialVal);
    });
    return unsubscribe;
  }, []);

  const loginAdmin = (password: string) => {
    return purchaseService.verifyAdminPassword(password);
  };

  const logoutAdmin = () => {
    purchaseService.logoutAdmin();
  };

  const setTier = (newTier: AppTier) => {
    return purchaseService.setTier(newTier);
  };

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

  const restoreWithTransferId = async (code: string) => {
    setIsLoading(true);
    try {
      return await purchaseService.restoreWithTransferId(code);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMockPro = () => {
    if (!isAdminAuthed) {
      return;
    }
    if (tier === 'free') {
      purchaseService.setTier('pro');
    } else if (tier === 'pro') {
      purchaseService.setTier('admin');
    } else {
      purchaseService.setTier('free');
    }
  };

  return {
    tier,
    isPro,
    isAdmin,
    isAdminAuthed,
    trialInfo,
    isFreeTrialActive: trialInfo.isFreeTrialActive,
    trialDaysRemaining: trialInfo.trialDaysRemaining,
    trialDaysTotal: trialInfo.trialDaysTotal,
    isPaidPro: purchaseService.isPaidPro(),
    isLoading,
    loginAdmin,
    logoutAdmin,
    setTier,
    purchase,
    restore,
    restoreWithTransferId,
    toggleMockPro,
  };
}


