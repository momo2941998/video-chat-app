
// CSS
import logo from './logo.svg';
import './App.css';

// Components
import { Input, Button } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
// React
import React, { useEffect, useRef, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
// Other 
import Peer from 'simple-peer'
import io from 'socket.io-client'

const socket = io.connect(window.env.SOCKET_IO)

function App() {
  const [me, setMe] = useState("")
  const [stream, setStream] = useState()
  const [receivingCall, setReceivingCall] = useState(false)
  const [caller, setCaller] = useState("")
  const [callerSignal, setCallerSignal] = useState()
  const [callAccepted, setCallAccepted] = useState(false)
  const [idToCall, setIdToCall] = useState("")
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState("")

  const myVideo = useRef()
  const userVideo = useRef()
  const connectionRef = useRef()

  useEffect(() => {
    const allowMedia = async() =>{
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setStream(currentStream)
      myVideo.current.srcObject = currentStream
    }
    allowMedia()


    socket.on('me', (id) => {
      setMe(id)
    })

    socket.on('callUser', (data) => {
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
    })

  }, [])

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name
      })
    })

    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream
    })

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  const answerCall = () => {
    setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })

    peer.on('signal', (data) => {
      socket.emit('answerCall', {signal: data, to: caller})
    })

    peer.on('stream', (xstream) => {
      userVideo.current.srcObject = xstream
    })

    peer.signal(callerSignal)
    connectionRef.current = peer
  }

  const leaveCall = () => {
    setCallEnded(true)
    connectionRef.current.destroy()
    window.open("/", "_self")
  }

  return (
    <div className="App" >
      <h1 style={{textAlign: 'center', color: '#fff'}}> Call App</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{width: "300px"}} />}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? 
              <video playsInline ref={userVideo} autoPlay style={{width: "400px"}} />:
              null
            }
          </div>
          <div className="myId">
            <Input 
              placeholder="Input your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <CopyToClipboard
              text={me}
            > 
              <Button icon={<CopyOutlined/>}>Copy your ID</Button>
            </CopyToClipboard>
            
            <Input 
              placeholder="Input your partner ID..."
              value={idToCall}
              onChange={(e)=> setIdToCall(e.target.value)}
            />

            <div>
              {callAccepted && !callEnded ? (
                <Button 
                  onClick={leaveCall}
                >
                  End call
                </Button>
              ): (
                <Button 
                  onClick={() => callUser(idToCall)}
                >
                  Call
                </Button>
              )}
              {idToCall}
            </div>
            
          </div>
          <div>
            {receivingCall && !callAccepted ? (
              <div>
                <h1> {name} is calling...</h1>
                <Button onClick={answerCall}>
                  Answer
                </Button>
              </div>
            ): null }
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
