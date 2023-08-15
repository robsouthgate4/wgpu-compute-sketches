
export const getClassFromString = (name) =>
  `.${name.replace(/_/g, "-")}`;

export const timeout = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const fit = (
  value,
  low1,
  high1,
  low2,
  high2
) => {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
};

export const bellCurve = (value) => {
  return (Math.sin(2 * Math.PI * (value - 0.2)) + 1) / 2;
};

export const lerp = (v0, v1, t) => {
  return v0 * (1 - t) + v1 * t;
};

export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
};

export const strToBool = (s) => {
  const regex = /^\s*(true|1|on)\s*$/i;
  return regex.test(s);
};

export const getSearchParam = (param) => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const paramType = urlParams.has(param);
  return urlParams.has("debug") && paramType;
};

export const normalizeColor = (color) => {
  return color.map((c) => c / 255);
};

export const isIOS = () => {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
};

export const isSafari = () =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const isChrome = () => /CriOS/i.test(navigator.userAgent);

export const isFirefoxIOS = () => navigator.userAgent.match("FxiOS");

export const getDeviceType = () => {
  const ua = navigator.userAgent;
  //@ts-ignore
  if (!!window.MSInputMethodContext && !!document.documentMode) {
    // ie11
    return "desktop";
  }

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }

  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "mobile";
  }

  return "desktop";
};

export const loadAudioBuffer = (url, audioContext) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      audioContext.decodeAudioData(
        request.response,
        function (buffer) {
          resolve(buffer);
        },
        reject
      );
    };

    request.send();
  });
};

export const flattenFloatArray = (arr) => {
  let totalLength = 0;
  for (let i = 0; i < arr.length; i++) {
    totalLength += arr[i].length;
  }

  const result = new Float32Array(totalLength);
  let offset = 0;
  for (let i = 0; i < arr.length; i++) {
    result.set(arr[i], offset);
    offset += arr[i].length;
  }

  return result;
};

export const wait = async(time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export const loadBinaryBuffer = (url) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      resolve(request.response);
    };

    request.onerror = (err) => {
      reject(err);
    };

    request.send();
  });
};
