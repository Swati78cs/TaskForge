const sendEmailHandler = require('./emailHandler');
const generatePdfHandler = require('./pdfHandler');
const processImageHandler = require('./imageHandler');
const apiRequestHandler = require('./apiRequestHandler');

const handlers = {
  send_email: sendEmailHandler,
  generate_pdf: generatePdfHandler,
  process_image: processImageHandler,
  api_request: apiRequestHandler,
};

const getHandler = (jobType) => {
  const handler = handlers[jobType];
  if (!handler) {
    throw new Error(`No handler registered for job type: '${jobType}'`);
  }
  return handler;
};

const registerHandler = (jobType, handlerFn) => {
  handlers[jobType] = handlerFn;
};

module.exports = {
  handlers,
  getHandler,
  registerHandler,
};
