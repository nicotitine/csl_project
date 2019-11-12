class Error {
  constructor(message, no, origin) {
    this.message = message;
    this.no = no;
    this.origin = origin;
  }
};

module.exports = Error;