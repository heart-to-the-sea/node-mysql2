'use strict';

const ClientConstants = require('../constants/client.js');
const CharsetToEncoding = require('../constants/charset_encodings.js');
const Packet = require('../packets/packet.js');

const auth41 = require('../auth_41.js');

class HandshakeResponse {
  constructor(handshake) {
    this.user = handshake.user || '';
    this.database = handshake.database || '';
    this.password = handshake.password || '';
    this.passwordSha1 = handshake.passwordSha1;
    this.authPluginData1 = handshake.authPluginData1;
    this.authPluginData2 = handshake.authPluginData2;
    this.compress = handshake.compress;
    this.clientFlags = handshake.flags;
    // TODO: pre-4.1 auth support
    let authToken;
    if (this.passwordSha1) {
      authToken = auth41.calculateTokenFromPasswordSha(
        this.passwordSha1,
        this.authPluginData1,
        this.authPluginData2
      );
    } else {
      authToken = auth41.calculateToken(
        this.password,
        this.authPluginData1,
        this.authPluginData2
      );
    }
    this.authToken = authToken;
    this.charsetNumber = handshake.charsetNumber;
    this.encoding = CharsetToEncoding[handshake.charsetNumber];
    this.connectAttributes = handshake.connectAttributes;
  }
  // 序列化response
  serializeResponse(buffer) {
    console.group("处理序列化")
    console.log(`
      传入一个空的buffer，然后实例化自己的buffer处理函数
      将用户传入的user password database 拼接在一个buffer中
    `)
    const isSet = flag => this.clientFlags & ClientConstants[flag];
    const packet = new Packet(0, buffer, 0, buffer.length);
    console.log('0-3 不填写'); packet.offset = 4;
    console.log('4-6 填写连接标识符');packet.writeInt32(this.clientFlags); // 
    console.log('7 - 10 写 0 ');packet.writeInt32(0); // max packet size. todo: move to config
    console.log('11 - 12 写 0 charsetNumber');packet.writeInt8(this.charsetNumber);
    console.log('13 - 35 空出 23 个位置');packet.skip(23);
    const encoding = this.encoding;
    console.log('36 - 40 写入用户名');packet.writeNullTerminatedString(this.user, encoding);
    let k;
    if (isSet('PLUGIN_AUTH_LENENC_CLIENT_DATA')) {
      packet.writeLengthCodedNumber(this.authToken.length);
      packet.writeBuffer(this.authToken);
    } else if (isSet('SECURE_CONNECTION')) {
      packet.writeInt8(this.authToken.length);
      packet.writeBuffer(this.authToken);
    } else {
      packet.writeBuffer(this.authToken);
      packet.writeInt8(0);
    }
    if (isSet('CONNECT_WITH_DB')) {
      packet.writeNullTerminatedString(this.database, encoding);
    }
    if (isSet('PLUGIN_AUTH')) {
      // TODO: pass from config
      packet.writeNullTerminatedString('mysql_native_password', 'latin1');
    }
    if (isSet('CONNECT_ATTRS')) {
      const connectAttributes = this.connectAttributes || {};
      const attrNames = Object.keys(connectAttributes);
      let keysLength = 0;
      for (k = 0; k < attrNames.length; ++k) {
        keysLength += Packet.lengthCodedStringLength(attrNames[k], encoding);
        keysLength += Packet.lengthCodedStringLength(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
      packet.writeLengthCodedNumber(keysLength);
      for (k = 0; k < attrNames.length; ++k) {
        packet.writeLengthCodedString(attrNames[k], encoding);
        packet.writeLengthCodedString(
          connectAttributes[attrNames[k]],
          encoding
        );
      }
    }
    console.groupEnd("处理序列化")
    return packet;
  }

  toPacket() {
    debugger
    if (typeof this.user !== 'string') {
      throw new Error('"user" connection config property must be a string');
    }
    if (typeof this.database !== 'string') {
      throw new Error('"database" connection config property must be a string');
    }
    // dry run: calculate resulting packet length
    //  序列化发送值 MockBuffer是将所有的函数清空?? 什么操作？？
    const p = this.serializeResponse(Packet.MockBuffer());
    console.log("序列化发送值： " + p);
    // 创建空的buffer 并设置相应的位数
    return this.serializeResponse(Buffer.alloc(p.offset));
  }
  static fromPacket(packet) {
    const args = {};
    args.clientFlags = packet.readInt32();
    function isSet(flag) {
      return args.clientFlags & ClientConstants[flag];
    }
    args.maxPacketSize = packet.readInt32();
    args.charsetNumber = packet.readInt8();
    const encoding = CharsetToEncoding[args.charsetNumber];
    args.encoding = encoding;
    packet.skip(23);
    args.user = packet.readNullTerminatedString(encoding);
    let authTokenLength;
    if (isSet('PLUGIN_AUTH_LENENC_CLIENT_DATA')) {
      authTokenLength = packet.readLengthCodedNumber(encoding);
      args.authToken = packet.readBuffer(authTokenLength);
    } else if (isSet('SECURE_CONNECTION')) {
      authTokenLength = packet.readInt8();
      args.authToken = packet.readBuffer(authTokenLength);
    } else {
      args.authToken = packet.readNullTerminatedString(encoding);
    }
    if (isSet('CONNECT_WITH_DB')) {
      args.database = packet.readNullTerminatedString(encoding);
    }
    if (isSet('PLUGIN_AUTH')) {
      args.authPluginName = packet.readNullTerminatedString(encoding);
    }
    if (isSet('CONNECT_ATTRS')) {
      const keysLength = packet.readLengthCodedNumber(encoding);
      const keysEnd = packet.offset + keysLength;
      const attrs = {};
      while (packet.offset < keysEnd) {
        attrs[
          packet.readLengthCodedString(encoding)
        ] = packet.readLengthCodedString(encoding);
      }
      args.connectAttributes = attrs;
    }
    return args;
  }
}

module.exports = HandshakeResponse;
