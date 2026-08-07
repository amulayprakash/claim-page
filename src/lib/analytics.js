import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Generate or retrieve an anonymous session ID for this visitor
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Internal function to log events to Firestore
const logEvent = async (eventType, metadata = {}) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return; // Don't track localhost
  }
  try {
    const eventsRef = collection(db, "analytics_events");
    await addDoc(eventsRef, {
      eventType,
      timestamp: serverTimestamp(),
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    });
    console.log(`Analytics logged: ${eventType}`);
  } catch (error) {
    console.error("Error logging analytics:", error);
  }
};

export const logPageView = (path) => {
  return logEvent("page_view", { path });
};

export const logWalletConnect = (status, address = null) => {
  return logEvent("wallet_connect", { status, address });
};

export const logClaimAttempt = (status, error = null) => {
  return logEvent("claim_attempt", { status, error });
};

export const logCustomEvent = (eventName, metadata) => {
  return logEvent(eventName, metadata);
};
