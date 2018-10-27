self.importScripts("bessel/bessel.flow.js");

self.addEventListener("message", (message) => {
    var inRate = message.data.inRate;
    var outRate = message.data.outRate;

    var retio = outRate / inRate;
    var retio2 = inRate / outRate;
    var nyquistFreqRetio = message.data.nyquistFreqRetio;

    var from = message.data.from;
    var to = message.data.to;
    var inData = message.data.inData;
    var outData = new Array(to - from + 1);
    var nInSample = inData.length;
    var id = message.data.id;

    var windowSize = message.data.windowSize;
    var beta = message.data.beta;
    var kaiserWindow = function (beta, windowSize, x) {
        var v = Math.sqrt(1 - Math.pow(2 * ((x + windowSize / 2) / windowSize) - 1, 2));
        if (isNaN(v)) {
            return 0;
        }
        return BESSEL.besseli(beta * v, 0) / BESSEL.besseli(beta, 0);
    }

    if (inRate > outRate) {
        for (var i = 0; i < 100; i++) {
            for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
                var inpos = outpos * retio2;
                if (inpos > nInSample - 1) {
                    inpos = nInSample - 1;
                    outData[outpos] = inData[inpos];
                }
                else {
                    var data = 0.0;
                    var calcFrom = Math.round(inpos) - Math.round(windowSize / 2);
                    for (var n = calcFrom; n < calcFrom + windowSize; n++) {
                        if (-1 < n && n < nInSample) {
                            data += inData[n] * sinc((inpos - n) * retio * nyquistFreqRetio) * kaiserWindow(beta, windowSize, inpos - n);
                        }
                    }
                    outData[outpos - from] = data * retio * nyquistFreqRetio;
                }
            }
            var sendData = {
                type: "progress",
                id: id,
                progress: i,
            }
            self.postMessage(sendData);
        }
    }
    else {
        for (var i = 0; i < 100; i++) {
            for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
                var inpos = outpos * retio2;
                if (inpos > nInSample - 1) {
                    inpos = nInSample - 1;
                    outData[outpos] = inData[inpos];
                }
                else {
                    var data = 0.0;
                    var calcFrom = Math.round(inpos) - windowSize / 2;
                    for (var n = calcFrom; n < calcFrom + windowSize; n++) {
                        if (-1 < n && n < nInSample) {
                            data += inData[n] * sinc((inpos - n) * nyquistFreqRetio) * kaiserWindow(beta, windowSize, inpos - n);
                        }
                    }
                    outData[outpos - from] = data;
                }
            }
            var sendData = {
                type: "progress",
                id: id,
                progress: i,
            }
            self.postMessage(sendData);
        }
    }

    var sendData = {
        type: "outData",
        id: id,
        from: from,
        to: to,
        outData: outData,
    }
    self.postMessage(sendData);
    self.close();
});

function sinc(x) {
    if (x == 0) {
        return 1;
    }

    var _x = Math.PI * x;
    return Math.sin(_x) / _x;
}