"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAdmin = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Missing Firebase Admin env vars. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env");
}
const serviceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
};
// Initialize Firebase Admin
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.cert)(serviceAccount)
});
exports.firebaseAdmin = (0, auth_1.getAuth)(app);
