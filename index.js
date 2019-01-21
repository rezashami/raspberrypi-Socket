var CryptoJS = require("crypto-js");
var socketio = require("socket.io-client");
var sensor = require("node-dht-sensor");
// var socket = socketio("https://dry-sands-20975.herokuapp.com/");
var socket = socketio("http://192.168.1.103:3000/");

var aesCrypto = {};

(function(obj) {
  "use strict";

  obj.formatter = {
    prefix: "AESCryptoV10",
    stringify: function(params) {
      var str = this.prefix;
      str += params.salt.toString();
      str += params.ciphertext.toString();
      return str;
    },
    parse: function(str) {
      var params = CryptoJS.lib.CipherParams.create({}),
        prefixLen = this.prefix.length;

      if (str.indexOf(this.prefix) !== 0) {
        return params;
      }

      params.ciphertext = CryptoJS.enc.Hex.parse(str.substring(16 + prefixLen));
      params.salt = CryptoJS.enc.Hex.parse(
        str.substring(prefixLen, 16 + prefixLen)
      );
      return params;
    }
  };

  obj.encrypt = function(text, password) {
    try {
      return CryptoJS.AES.encrypt(text, password, {
        format: obj.formatter
      }).toString();
    } catch (err) {
      return "";
    }
  };

  obj.decrypt = function(text, password) {
    try {
      var decrypted = CryptoJS.AES.decrypt(text, password, {
        format: obj.formatter
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      return "";
    }
  };
})(aesCrypto);

var getEncrypted = s => {
  return aesCrypto.encrypt(s, "pass");
};
var getDecrypted = s => {
  var x = aesCrypto.decrypt(s, "pass");
  return x;
};

socket.on("connect", function() {
  console.log("Connected!");
  socket.emit("host-login", getEncrypted("Host"));
});

socket.on("response", function(data) {
  var res = getDecrypted(data);
  if (res === "NoAuth") {
    socket.disconnect();
  } else {
    console.log("User is recogenized");
  }
});

socket.on("full", function() {
  console.log("Server is full");
});

socket.on("message", function(data) {
  console.log(getDecrypted(data));
});

socket.on("disconnect", function() {
  console.log("User is Disconnected");
});

setInterval(() => {
  sensor.read(11, 4, function(err, temperature, humidity) {
    if (err) {
      socket.emit("error", getEncrypted(JSON.stringify(err)));
    } else {
      const data = JSON.stringify({ temperature, humidity });
      socket.emit("data", getEncrypted(data));
      console.log("Data sent", data);
    }
  });
}, 5000);

