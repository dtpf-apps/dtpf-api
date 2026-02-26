import { Socket } from 'socket.io';
import Contact from './models/contact';

export async function getMessagesLength(socket: Socket) {
  const messages = await Contact.find({ readed: false });
  socket.emit('getMessagesLength', messages.length);
}
