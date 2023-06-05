"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getWebViewLink = void 0;

var _axios = _interopRequireDefault(require("axios"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getWebViewLink = (baseUrl, token, phone, sId, srcClientId, deviceId, appVersion, deviceVersion) => {
  const data = {
    token,
    phone,
    sId,
    srcClientId,
    deviceId,
    appVersion,
    deviceVersion
  };
  console.log('getWebViewLink data', {
    data
  });
  return _axios.default.post(`${baseUrl}/partners/v2/generate-magic-link-star-health`, data).then(res => res).catch(err => err);
};

exports.getWebViewLink = getWebViewLink;
//# sourceMappingURL=Services.js.map