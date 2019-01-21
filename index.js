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

var intervalId;
socket.on("connect", function() {
  console.log("Connected!");
  var info ={
    userName:"Rasp",
    password: "admin123"
  };
  const data = JSON.stringify(info);
  socket.emit("rasp-login", getEncrypted(data));
});

socket.on("No-Auth", function(data) {
    console.log("User is No recogenized");
    socket.disconnect();
});

socket.on("welcome-rasp", function() {
  console.log("Raspberry start working");
  intervalId =setInterval(() => {
    sensor.read(11, 4, function(err, temperature, humidity) {
      if (err) {
        socket.emit("error-temp", getEncrypted(JSON.stringify(err)));
      } else {
        const data = JSON.stringify({ temperature, humidity });
        socket.emit("temp", getEncrypted(data));
        console.log("Data sent", data);
      }
    });
  }, 5000);
});

socket.on("NewCommand", function(data) {
  console.log(getDecrypted(data));
});

socket.on("No-android", function(){
  console.log("No android device!!");
  clearInterval(intervalId);
});
socket.on("Android-disconnected", function(){
  console.log("Android device is disconnected!!");
  clearInterval(intervalId);
});
socket.on("Sended-temp", function(){
  console.log("Tempurator is sended ture");
});
socket.on("Sended-error", function(){
  console.log("Tempurator is not sended. Error sended");
});
socket.on("disconnect", function() {
  console.log("User is Disconnected");
  clearInterval(intervalId);
  process.exit();
});




