import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions, RewardAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';

// TEST IDs — replace with your real IDs from admob.google.com after account approval
const AD_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

export async function initAds(): Promise<void> {
  try {
    await AdMob.initialize({ requestTrackingAuthorization: true });
  } catch (e) {
    console.log('AdMob not available (web mode)');
  }
}

export async function showBanner(): Promise<void> {
  try {
    const options: BannerAdOptions = {
      adId: AD_IDS.banner,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    };
    await AdMob.showBanner(options);
  } catch (e) {
    console.log('Banner ad not available');
  }
}

export async function hideBanner(): Promise<void> {
  try {
    await AdMob.hideBanner();
  } catch (e) {
    // not available on web
  }
}

export async function showInterstitial(): Promise<void> {
  try {
    const options: AdOptions = { adId: AD_IDS.interstitial };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  } catch (e) {
    console.log('Interstitial ad not available');
  }
}

export async function showRewarded(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const options: AdOptions = { adId: AD_IDS.rewarded };
      await AdMob.prepareRewardVideoAd(options);

      const listener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        listener.remove();
        resolve(true);
      });

      AdMob.showRewardVideoAd().catch(() => {
        listener.remove();
        resolve(false);
      });
    } catch (e) {
      console.log('Rewarded ad not available');
      resolve(false);
    }
  });
}
