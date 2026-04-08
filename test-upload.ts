import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDatabase, ref as dbRef, push, set } from 'firebase/database';

const config = {
  apiKey: 'AIzaSyBA3Y2VFks8E8dgcSmwRjoL1ISN4AN7S9E',
  authDomain: 'monitask-27c8f.firebaseapp.com',
  databaseURL: 'https://monitask-27c8f-default-rtdb.firebaseio.com',
  projectId: 'monitask-27c8f',
  storageBucket: 'monitask-27c8f.appspot.com',
  messagingSenderId: '559896353067',
  appId: '1:559896353067:web:90f5d33bdcf59068afcd6e'
};

const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app);
const database = getDatabase(app);

async function testUpload() {
  try {
    const cred = await signInAnonymously(auth);
    console.log('Logged in anonymously!', cred.user.uid);
    
    // Create a mock blob from a Uint8Array
    const arr = new Uint8Array([72, 101, 108, 108, 111]); // 'Hello'
    const myBlob = new Blob([arr], { type: 'text/plain' });

    const sRef = storageRef(storage, 'test/' + Date.now() + '.txt');
    console.log('Uploading byte to storage...');
    const snapshot = await uploadBytes(sRef, myBlob);
    console.log('Upload successful! Getting URL...');
    const url = await getDownloadURL(snapshot.ref);
    console.log('Got URL:', url);
    
    const pRef = push(dbRef(database, 'photos'));
    await set(pRef, { url, status: 'test', uploaderId: cred.user.uid, uploadedBy: 'Test', createdAt: Date.now(), viewsCount: 0, likesCount: 0 });
    console.log('Saved to DB successfully!');
    process.exit(0);
  } catch (e: any) {
    console.error('ERROR OCCURRED:', e);
    process.exit(1);
  }
}
testUpload();
