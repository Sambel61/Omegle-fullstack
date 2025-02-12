import { io } from 'socket.io-client';

// Global State
let peer;
const myVideo = document.getElementById('my-video');
const strangerVideo = document.getElementById('video');
const button = document.getElementById('send');
const online = document.getElementById('online');
let remoteSocket;
let type;
let roomid;

// Starts media capture
function start() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      if (peer) {
        myVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = e => {
          strangerVideo.srcObject = e.streams[0];
          strangerVideo.play();
        }
      }
    })
    .catch(ex => {
      console.log(ex);
    });
}

// Connect to the server
const socket = io('https://omegle-fullstack-j82c.onrender.com');

// Disconnect event
socket.on('disconnected', () => {
  location.href = `/?disconnect`;
});

// WebRTC related
socket.emit('start', (person) => {
  type = person;
});

socket.on('remote-socket', (id) => {
  remoteSocket = id;

  // Hide the spinner
  document.querySelector('.modal').style.display = 'none';

  // Create a peer connection
  peer = new RTCPeerConnection();

  // Handle peer connection negotiation
  peer.onnegotiationneeded = async e => {
    webrtc();
  };

  // Send ICE candidates to remote socket
  peer.onicecandidate = e => {
    socket.emit('ice:send', { candidate: e.candidate, to: remoteSocket });
  };

  // Start media capture
  start();
});

async function webrtc() {
  if (type == 'p1') {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
}

socket.on('sdp:reply', async ({ sdp, from }) => {
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));

  if (type == 'p2') {
    const ans = await peer.createAnswer();
    await peer.setLocalDescription(ans);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
});

socket.on('ice:reply', async ({ candidate, from }) => {
  await peer.addIceCandidate(candidate);
});

// Handle messages
socket.on('roomid', id => {
  roomid = id;
});

button.onclick = e => {
  let input = document.querySelector('input').value;
  socket.emit('send-message', input, type, roomid);

  // Add message in local message box as 'YOU'
  let msghtml = `
  <div class="msg">
    <b>You: </b> <span id='msg'>${input}</span>
  </div>
  `;
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;

  // Clear input
  document.querySelector('input').value = '';
};

socket.on('get-message', (input, type) => {
  // Add received message in chat box
  let msghtml = `
  <div class="msg">
    <b>Stranger: </b> <span id='msg'>${input}</span>
  </div>
  `;
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;
});
