We should automatically reject if we haven't received an ack within x amount of time
We need a .d.ts file

- Handshake

  - Allow multiple targets and multiple targetOrigins
  - Make a note somewhere on how the handshake works (using IDs as a sequence number, sequence numbers are based on message count, ack doesn't increment sequence number, etc.)
  - Create a optional config object for handshake variables (timeout, max retries, etc)
  - lastMessageSent, lastAckSent, lastAckReceived should be private and only accessible through getters and incrementors

- Message Queue

  - Don't send messages before the handshake has been established
  - After the handshake has been established, send all the messages that have been queued up
  - If the incoming ack ID === the ID of the lastAckReceived, you have to resend the messages after that ID
  - If the incoming message ID - 1 > lastAckSent, you are missing messages and need to request that they be resent

- Auto Retry

  - Auto retry and then timeout if no ack received (same with syn ack)

- Multiple Connections

  - Add a uuid for identifying windows so that multiple connections can be established
  - Refactor handshake for multiple connections
  - Refactor message queue for multiple connections
  - Refactor auto retry for multiple connections
  - Refactor message sending for multiple connections
  - Refactor message handling for multiple connections

- add warning about the dangers of using "\*" as targetOrigin
- expose a listener killer/cleanup function
- .d.ts
- TS generic typing for remote model
- Make sure all TODOs have been handled
- Test in TS env
- tests
- eslint
- Better errors around improper usage?
- Docs
- Update bundler to strip comments when bundling for prod
- Look into TS source map for dev bundling and debugging
- CI Pipeline for automatic publishing on merge to main
- License
