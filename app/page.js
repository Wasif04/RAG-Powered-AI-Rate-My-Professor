'use client'
import Image from "next/image";
import { Box, Button, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { useUser, SignInButton, SignOutButton, RedirectToSignIn } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (!isSignedIn) {
      alert('You must be signed in to send a message');
      return;
    }

    setMessage('');
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: 'user', content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        background: 'linear-gradient(110.6deg, rgb(156, 116, 129) -18.3%, rgb(67, 54, 74) 16.4%, rgb(47, 48, 67) 68.2%, rgb(27, 23, 36) 99.1%)',
      }}
    >
      <Stack
         direction={'column'}
         width="500px"
         height="700px"
         p={2}
         spacing={3}
         bgcolor="rgba(255, 255, 255, 0.9)"
         borderRadius={4}
         boxShadow="0px 10px 30px rgba(0, 0, 0, 0.2)"
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          sx={{
            padding: '10px',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: '10px',
            },
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
              sx={{
                marginBottom: '10px',
              }}
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? 'rgb(216, 191, 216)' 
                    : 'rgb(58, 58, 158)' 
                }
                color="white"
                borderRadius={16}
                p={4}
                maxWidth="100%"
                wordWrap="break-word" 
                boxShadow="0px 5px 15px rgba(0, 0, 0, 0.1)"
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '30px',
              },
            }}
            InputProps={{
              sx: {
                paddingLeft: '15px',
              },
            }}
          />
          <Button 
            variant="contained"
            onClick={sendMessage}
            sx={{
              padding: '10px 20px',
              borderRadius: '30px',
              backgroundColor: '#4A90E2',
              '&:hover': {
                backgroundColor: '#357ABD',
              },
            }}
          
          >
            Send
          </Button>
        </Stack>
        <SignOutButton
          sx={{
            marginTop: '10px',
            borderRadius: '20px',
            backgroundColor: '#E57373',
            color: 'white',
            '&:hover': {
              backgroundColor: '#D32F2F',
            },
          }}
        />
      </Stack>
    </Box>
  );
}
