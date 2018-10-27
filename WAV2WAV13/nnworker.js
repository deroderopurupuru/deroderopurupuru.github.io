self.addEventListener("message", (message) => {
    var retio2 = message.data.inRate / message.data.outRate;

    var from = message.data.from;
    var to = message.data.to;
    var inData = message.data.inData;
    var outData = new Array(to - from + 1);
    var nInSample = inData.length;
    var id = message.data.id;
    for (var i = 0; i < 100; i++) {
        for (var outpos = Math.ceil((to - from + 1) * i / 100) + from; outpos < Math.ceil((to - from + 1) * (i + 1) / 100) + from; outpos++) {
            var inpos = Math.round(outpos * retio2);
            if (inpos > nInSample - 1) {
                inpos = nInSample - 1;
            }
            outData[outpos - from] = inData[inpos];
        }
        var sendData = {
            type: "progress",
            id: id,
            progress: i,
        }
        self.postMessage(sendData);
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