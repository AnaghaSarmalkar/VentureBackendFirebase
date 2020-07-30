const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')
// Connect to the database

admin.initializeApp();

const express = require('express');
const app = express();

app.use(cors())

const act_db = "Activities"
const user_db = "Users"
const user_activity = "UserActivities"

const firebaseConfig = {
  apiKey: "AIzaSyD8O78xVGclD89yOdKjwc2Ff00MgcZfjSo",
  authDomain: "venturedb-f74f4.firebaseapp.com",
  databaseURL: "https://venturedb-f74f4.firebaseio.com",
  projectId: "venturedb-f74f4",
  storageBucket: "venturedb-f74f4.appspot.com",
  messagingSenderId: "208134622090",
  appId: "1:208134622090:web:db9523081e5bb661585673",
  measurementId: "G-KGBSLSF7DS"
};

const firebase = require('firebase');
const { firestore } = require('firebase-admin');
firebase.initializeApp(firebaseConfig);


const authenticate = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(403).send('Unauthorized');
    return;
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (e) {
    res.status(403).send('Unauthorized');
    return;
  }
};


// Show list of screams
app.post('/activities', authenticate, (req, res) => {
  const activity = req.body
  // response.send({ activity: request.body })
  console.log(activity);
  admin
    .firestore()
    .collection(act_db)
    .add(activity)
    .then(doc => {
      res.json({ message: `document ${doc.id} created successfully` })
    })
    .catch(err => {
      res.status(500).json({ message: 'somethings wrong', error: err });
      console.error(err);
    })
})

// Add a new scream
app.get('/activities', (req, res) => {
  admin
    .firestore()
    .collection(act_db)
    .get()
    .then(data => {
      let activities = [];
      data.forEach(doc => {
        activities.push({
          activity_id: doc.id,
          ...doc.data()
        })
      })
      res.json(activities)
    })
    .catch(err => console.error(err));
})

//get activities for user, dashboard

app.post('/signup', (req, res) => {
  const newUser = req.body
  const { email, password } = newUser
  console.log(req.body);
  admin
    .firestore()
    .doc(`/${user_db}/${email}`)
    .get()
    .then(data => {
      if (data.exists) {
        return res.json({ msg: "Acc with this email exists" })
      }
      else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(email, password)
          .then(data => {
            let db_data = {
              ...newUser,
              uid: data.user.uid
            }
            delete db_data.password
            admin.firestore().collection(user_db).doc(email).set(db_data)
            return res.json({ msg: "okay entered", data })
          })
      }
    })
    .catch(err => {
      console.error(err)
      res.json({ err });
    })
})

app.post('/login', (req, res) => {
  const { email, password } = req.body
  // return res.json({ email, password })
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(data => {
      // let user = { accessToken: data.user.stsTokenManager.accessToken }
      // console.log(user);
      return admin
        .firestore()
        .doc(`/${user_db}/${email}`)
        .get()
        .then(doc => {
          let user = { ...doc.data(), authToken: data.user }
          res.json({ user })
        })
    })
    .catch(err => res.status(404).json({ msg: "Login error" }));
})

app.get('/activity/:id', (req, res) => {
  activity_id = req.params.id
  return admin
    .firestore()
    .doc(`/${act_db}/${activity_id}`)
    .get()
    .then(doc => {
      let activity_detail = doc.data()
      activity_detail.activity_id = activity_id
      res.json({ activity_detail })
    })
})

app.post('/activity/:id', authenticate, (req, res) => {
  let activity_id = req.params.id
  let user_id = req.body.uid
  let rsvp = req.body.rsvp
  return admin
    .firestore()
    .doc(`/${user_activity}/${user_id}`)
    .get()
    .then(data => {
      return admin
        .firestore()
        .collection(user_activity)
        .doc(user_id)
        .update({ [activity_id]: rsvp })
    }
    )
    .then(() => res.json({ msg: "activity added" }))
    .catch(err => console.error(err));
})

app.get('/myActivity', authenticate, (req, res) => {
  const uid = req.query.uid
  return admin
    .firestore()
    .doc(`/${user_activity}/${uid}`)
    .get()
    .then(data => {
      if (!data.exists) {
        res.json({ activities: [] })
      }
      else {
        let activities = []
        let pr = []
        let rsvp_activities = data.data()
        Object.entries(rsvp_activities).forEach((act) => {
          let act_id = act[0]
          const p = admin
            .firestore()
            .doc(`/${act_db}/${act_id}`)
            .get()
            .then(doc => {
              if (doc.exists) {
                const activity = doc.data()
                activity.rsvp = act[1]
                activity.id = act_id
                activities.push(activity)
              }
            })
          pr.push(p)
        })
        Promise.all(pr)
          .then(() => {
            res.json({ activities })
          })

      }
    })
}
)




exports.api = functions.https.onRequest(app);