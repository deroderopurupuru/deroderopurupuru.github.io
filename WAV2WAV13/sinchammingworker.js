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
    var a = message.data.a;
    var hammingWindow = function (windowSize, a, x) {
        return a - (1 - a) * Math.cos(2 * Math.PI * (x + windowSize / 2) / windowSize);
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
                    var calcFrom = Math.round(inpos) - windowSize / 2;
                    for (var n = calcFrom; n < calcFrom + windowSize; n++) {
                        if (-1 < n && n < nInSample) {
                            data += inData[n] * sinc((inpos - n) * retio * nyquistFreqRetio) * hammingWindow(windowSize, a, inpos - n);
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
                            data += inData[n] * sinc((inpos - n) * nyquistFreqRetio) * hammingWindow(windowSize, a, inpos - n);
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