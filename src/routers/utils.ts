import express from 'express';
import * as UtilsController from '../controllers/utils';

const api = express.Router();

api.post('/create-reload-messages', UtilsController.createReloadMessages);
api.post('/create-indexeddb-version', UtilsController.createIndexedDBVersion);
api.get('/get-indexeddb-version', UtilsController.getIndexedDBVersion);
api.put('/update-indexeddb-version', UtilsController.updateIndexedDBVersion);
api.get('/connection', UtilsController.connection);
api.get('/messages-status', UtilsController.messagesStatus);
api.post('/reload-messages/:haveToReload', UtilsController.reloadMessages);

export default api;
