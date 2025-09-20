import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'
import type { WhereFilterOp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase only if it hasn't been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics (only on client side)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    const supported = await isSupported()
    if (supported) {
      return getAnalytics(app)
    }
  }
  return null
}

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  const { signInWithEmailAndPassword } = await import('firebase/auth')
  return signInWithEmailAndPassword(auth, email, password)
}

export const signUp = async (email: string, password: string) => {
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  return createUserWithEmailAndPassword(auth, email, password)
}

export const signOut = async () => {
  const { signOut: firebaseSignOut } = await import('firebase/auth')
  return firebaseSignOut(auth)
}

// Firestore helper functions
type FirestoreData = Record<string, unknown>

export const addDocument = async (collectionName: string, data: FirestoreData) => {
  const { addDoc, collection: firestoreCollection, serverTimestamp } = await import('firebase/firestore')
  return addDoc(firestoreCollection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export const updateDocument = async (collectionName: string, docId: string, data: FirestoreData) => {
  const { updateDoc, doc } = await import('firebase/firestore')
  return updateDoc(doc(db, collectionName, docId), data)
}

export const getDocuments = async (collectionName: string, whereClause?: [string, WhereFilterOp, unknown]) => {
  const { getDocs, collection: firestoreCollection, query, where } = await import('firebase/firestore')
  const q = whereClause
    ? query(firestoreCollection(db, collectionName), where(...whereClause))
    : firestoreCollection(db, collectionName)
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const onAuthStateChanged = (callback: (user: unknown) => void) => {
  import('firebase/auth').then(({ onAuthStateChanged: firebaseOnAuthStateChanged, getAuth }) => {
    firebaseOnAuthStateChanged(getAuth(), callback)
  })
}

export default app