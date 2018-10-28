var nInSample;
var inData;
var outData;
var out8bitData;
var inBit;
var inRate;
var outRate;
var detune;

var notevalueDef = [
    { note: "64", tick: 6, name: "1/64", name2: "64分音符" },
    { note: "48", tick: 8, name: "1/32 3連", name2: "半拍12連符" },
    { note: "64_", tick: 9, name: "1/64 付点", name2: "付点64分音符" },
    { note: "32", tick: 12, name: "1/32", name2: "32分音符" },
    { note: "24", tick: 16, name: "1/16 3連", name2: "半拍6連符" },
    { note: "32_", tick: 18, name: "1/32 付点", name2: "付点32分音符" },
    { note: "16", tick: 24, name: "1/16", name2: "16分音符" },
    { note: "12", tick: 32, name: "1/8 3連", name2: "半拍3連符" },
    { note: "16_", tick: 36, name: "1/16 付点", name2: "付点16分音符" },
    { note: "8", tick: 48, name: "1/8", name2: "8分音符" },
    { note: "6", tick: 64, name: "1/4 3連", name2: "1拍3連符" },
    { note: "8_", tick: 72, name: "1/8 付点", name2: "付点8分音符" },
    { note: "4", tick: 96, name: "1/4", name2: "4分音符" },
    { note: "3", tick: 128, name: "1/2 3連", name2: "2拍3連符" },
    { note: "4_", tick: 144, name: "1/4 付点", name2: "付点4分音符" },
    { note: "2", tick: 192, name: "1/2", name2: "2分音符" },
    { note: "2_", tick: 288, name: "1/2 付点", name2: "付点2分音符" },
    { note: "1", tick: 384, name: "1/1", name2: "全音符" },
    { note: "1_", tick: 576, name: "1/1 付点", name2: "付点全音符" },
];

function onChangeFile(evt) {
    var reader = new FileReader();
    var file = evt.target.files[0];

    if (!file) {
        return;
    }

    reader.addEventListener("loadend", onFileLoadend);
    reader.readAsArrayBuffer(file);
}

function onChangeAmp(evt) {
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nWav13Def = Math.ceil(outData.length / wav13MaxLen);
    var numOffset = Number(evt.target.id.slice(10));
    var mlt = evt.target.value;

    for (var i = numOffset + 1; i < nWav13Def; i++) {
        getElement("amp-input-" + i).value = mlt;
    }
}

function onChangeWav13FastNum(evt) {
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nWav13Def = Math.ceil(outData.length / wav13MaxLen);
    var fastNum = Number(getElement("wav13FastNum").value);
    for (var i = 0; i < nWav13Def; i++) {
        var element = getElement("amp-num-" + i);
        element.textContent = "@13-" + (fastNum + i) + " ";
    }
}

function onFileLoadend(evt) {
    var i;
    var fileData = new Uint8Array(evt.target.result);
    var fmtOffset;
    var dataOffset;
    var dataOffset2;
    var dataSize;
    var nChannel;

    // 0x00 ~ 0x03 が R I F F
    // 0x08 ~ 0x0B が W A V E
    if (fileData[0x00] != 0x52
        || fileData[0x01] != 0x49
        || fileData[0x02] != 0x46
        || fileData[0x03] != 0x46
        || fileData[0x08] != 0x57
        || fileData[0x09] != 0x41
        || fileData[0x0A] != 0x56
        || fileData[0x0B] != 0x45
    ) {
        writeCaption("fileCaption", "RIFF WAVE形式のファイルではありません", true);
        return;
    }

    // fmtチャンクを探す
    for (i = 0x0C; i < fileData.length - 4; i++) {
        if (fileData[i] == 0x66
            && fileData[i + 1] == 0x6D
            && fileData[i + 2] == 0x74
            && fileData[i + 3] == 0x20
        ) {
            fmtOffset = i;
            break;
        }
    }
    if (fileData.length - 4 == i) {
        writeCaption("fileCaption", "fmtチャンクが見つかりません", true);
        return;
    }

    // フォーマットID
    if (fileData[fmtOffset + 8] != 0x01
        || fileData[fmtOffset + 9] != 0x00
    ) {
        writeCaption("fileCaption", "フォーマットIDが1(リニアPCM)ではありません", true);
        return;
    }

    // チャンネル数
    nChannel = fileData[fmtOffset + 10] + (fileData[fmtOffset + 11] << 8);

    // サンプリングレート
    inRate = fileData[fmtOffset + 12] + (fileData[fmtOffset + 13] << 8)
        + (fileData[fmtOffset + 14] << 16) + (fileData[fmtOffset + 15] << 24);

    // ビット数(とりあえず8bitと16bitのみ)
    inBit = fileData[fmtOffset + 22]
        + (fileData[fmtOffset + 23] << 8);
    if (inBit != 8 && inBit != 16) {
        writeCaption("fileCaption", "ビット深度が8bitもしくは16bitではありません", true);
        return;
    }

    // dataチャンクを探す(fmtの次がdataじゃないのも考慮しているけど、あるのかな)
    for (i = 0x0C; i < fileData.length - 4; i++) {
        if (fileData[i] == 0x64
            && fileData[i + 1] == 0x61
            && fileData[i + 2] == 0x74
            && fileData[i + 3] == 0x61
        ) {
            dataOffset = i;
            break;
        }
    }
    if (fileData.length - 4 == i) {
        writeCaption("fileCaption", "dataチャンクが見つかりません", true);
        return;
    }

    // dataサイズ(バイト数)
    dataSize = fileData[dataOffset + 4] + (fileData[dataOffset + 5] << 8)
        + (fileData[dataOffset + 6] << 16) + (fileData[dataOffset + 7] << 24);

    // サンプル読み込み
    // ステレオの時は (左+右)/2 でモノラルにする
    nInSample = dataSize / nChannel / (inBit / 8);
    inData = new Array(nInSample);
    dataOffset2 = dataOffset + 8;
    for (i = 0; i < nInSample; i++) {
        if (inBit == 8) {
            if (nChannel == 1) {
                inData[i] = fileData[dataOffset2 + i];
            }
            else {
                inData[i] = (fileData[dataOffset2 + i * 2] + fileData[dataOffset2 + i * 2 + 1]) / 2.0;
            }
        }
        else {
            if (nChannel == 1) {
                inData[i] = convInt16(fileData[dataOffset2 + i * 2 + 1], fileData[dataOffset2 + i * 2]);
            }
            else {
                inData[i] = convInt16(fileData[dataOffset2 + i * 4 + 1], fileData[dataOffset2 + i * 4]);
                inData[i] += convInt16(fileData[dataOffset2 + i * 4 + 3], fileData[dataOffset2 + i * 4 + 2]);
                inData[i] /= 2.0;
            }
        }
    }

    writeCaption("fileCaption", inRate + "Hz " + inBit + "bit " + nChannel + "ch " + inData.length + "サンプル", false);
}

function onClickConvRate(evt) {
    var tick = Number(getElement("tick").value);
    var tempo = Number(getElement("tempo").value);
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var detuneAct;

    // 元波形をノーマライズ
    if (getRadBtnValue("normalize") == "true") {
        normalize(inData, inBit);
    }

    // テンポとtickカウントから再生周波数(デチューン値)を求める
    // この再生周波数なら、tick時間内にバンクがぴったりに収まる
    // とりあえずo5a(440Hz)を基準にする
    // バンクがループしないように、計算結果は切り捨て
    detuneAct = 1200 * Math.log2(96 / 60 / 440 / tick * tempo);
    detune = Math.floor(detuneAct);

    if (getRadBtnValue("rate-manual") == "true") {
        outRate = getElement("rate").value;
    }
    else {
        // 変換先サンプリングレートを求める
        outRate = wav13MaxLen * 440 * Math.pow(2, detune / 1200);
    }

    getElement("convCaption").textContent = Math.round(outRate * 100) / 100 + "Hz";

    // サンプリングレート変換
    var onProgress = function (progress) {
        getElement("progress").textContent = Math.round(progress) + "%";
    }

    var onConvEnd = function (data) {
        var endt = performance.now();
        // console.log("Rate conversion time :" + (endt - startt) / 1000 + "s");
        outData = data;

        getElement("convCaption").textContent += " " + outData.length + "サンプル";
        getElement("progress").textContent = "100%";
        writeAmpList();

        myDispatchEvent("wav13FastNum", "change");
        myDispatchEvent("convBit", "click");
    }
    var Conv = new SamplingRateConv(Number(getElement("nWorker").value));
    var startt = performance.now();
    switch (getRadBtnValue("convAL")) {
        case "NN":
            Conv.convNN(inRate, outRate, inData, onProgress, onConvEnd);
            break;
        case "Lerp":
            Conv.convLerp(inRate, outRate, inData, onProgress, onConvEnd);
            break;
        case "Sinc":
            Conv.convSinc(inRate, outRate, inData, Number(getElement("nyquistFreqRetio").value), onProgress, onConvEnd);
            break;
        case "SincHamming":
            Conv.convSincHamming(inRate, outRate, inData, Number(getElement("hammingWindowSize").value), Number(getElement("hammingParameter").value), Number(getElement("nyquistFreqRetio").value), onProgress, onConvEnd);
            break;
        case "SincBlackman":
            Conv.convSincBlackman(inRate, outRate, inData, Number(getElement("blackmanWindowSize").value), Number(getElement("nyquistFreqRetio").value), onProgress, onConvEnd);
            break;
        case "SincKaiser":
            Conv.convSincKaiser(inRate, outRate, inData, Number(getElement("kaiserWindowSize").value), Number(getElement("kaiserBeta").value), Number(getElement("nyquistFreqRetio").value), onProgress, onConvEnd);
            break;
    }
}

function onClickConvBit(evt) {
    onChangeMMLSettings();
}

function onClickSaveWav(evt) {
    myDispatchEvent("convRate", "click");
    saveWav(1, inBit, outRate, outData);
}

function onClickSaveWav8bit(evt) {
    myDispatchEvent("convRate", "click");
    myDispatchEvent("convBit", "click");
    saveWav(1, 8, outRate, out8bitData);
}

function writeAmpList() {
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nWav13Def = Math.ceil(outData.length / wav13MaxLen);
    var parent = getElement("ampList");
    parent.textContent = null;
    var str = "";
    for (var i = 0; i < nWav13Def; i++) {
        var label = createElement("label");
        var span = createElement("span");
        var span2 = createElement("span");
        var span3 = createElement("span");
        var input = createElement("input");
        label.appendChild(span);
        label.appendChild(input);
        label.appendChild(span2);
        label.appendChild(span3);
        parent.appendChild(label);

        span.id = "amp-num-" + i;
        span.classList.add("amp-num");

        input.type = "text";
        input.id = "amp-input-" + i;
        input.value = "1.0";
        input.addEventListener("change", onChangeAmp);

        span2.textContent = " 補正前最大 "
        var max = maxAbsSigned(outData.slice(i * wav13MaxLen, i < nWav13Def - 1 ? (i + 1) * wav13MaxLen : outData.length));
        span2.textContent += Math.round(max * 100) / 100;

        /*
        var db = 20 * Math.log10((nBit == 16 ? Math.abs(max) * 2 : Math.abs(max - 128) * 2) / (nBit == 16 ? 65536 : 256));
        span2.textContent += "(" + Math.round(db * 100) / 100 + "db)";
        */
    }
}

function writeMacroList() {
    var parent = getElement("macroList");
    for (var i = 0; i < notevalueDef.length; i++) {
        var label = createElement("label");
        var input = createElement("input");
        var span = createElement("span");
        label.appendChild(input);
        label.appendChild(span);
        parent.appendChild(label);

        label.classList.add("macro-label");

        input.id = "check" + notevalueDef[i].tick;
        input.type = "checkbox";
        var tick = notevalueDef[i].tick;
        if (tick == 24 || tick == 48 || tick == 96 || tick == 192 || tick == 384) {
            input.checked = "checked";
        }
        input.addEventListener("change", onChangeMMLSettings);

        span.textContent = notevalueDef[i].name;
        // span.textContent = "c" + notevalueDef[i].note;
    }
    label = createElement("label");
    input = createElement("input");
    span = createElement("span");
    label.appendChild(input);
    label.appendChild(span);
    parent.appendChild(label);
    label.classList.add("macro-label");
    input.id = "checkALL";
    input.type = "checkbox";
    input.checked = "";
    input.addEventListener("change", onChangeMMLSettings);
    span.textContent = "音価未調整マクロを出力する";

    label = createElement("label");
    input = createElement("input");
    span = createElement("span");
    label.appendChild(input);
    label.appendChild(span);
    parent.appendChild(label);
    label.classList.add("macro-label");
    input.id = "checkMinMacro";
    input.type = "checkbox";
    input.checked = "checked";
    input.addEventListener("change", onChangeMMLSettings);
    span.textContent = "無駄なマクロを出力しない";
}

function onChangeMMLSettings() {
    var l = getRadBtnValue("convBitAmp") == "true" ?
        calcAmp(outData, inBit, getElement("wav13MaxLen").value) :
        getAmpList();
    out8bitData = conv8bit(outData, inBit, l);
    writeMML(l);
}

function writeMML(ampList) {
    var wav13FastNum = Number(getElement("wav13FastNum").value);
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nSample = out8bitData.length;
    var nWav13Def = Math.ceil(nSample / wav13MaxLen);
    var tick = Number(getElement("tick").value);
    var lastTick = Math.ceil(tick * (nSample % wav13MaxLen) / wav13MaxLen);
    var tickAll = tick * (nWav13Def - 1) + lastTick;
    var wav13LastLen = Math.ceil(wav13MaxLen * lastTick / tick);
    var lastDetune = Math.floor(1200 * Math.log2(outRate / wav13LastLen / 440));
    var macroName = "";
    var macroStr = "";
    var macroDefs = new Array();
    var wav13Str = "";
    var amp;
    var macroBaseName = getElement("macroBaseName").value;
    var currentWav13Num = wav13FastNum;
    var currentAmp;
    var i;

    // var initialMacro = "$INIT = @X127 @E1,0,0,512,0 " + "@D" + detune + " " + "Q16 o5" + ";";

    var macro_allwav13def = function (name, str) {
        if (!getElement("checkALL").checked) {
            return;
        }
        macroName = macroBaseName + name;
        macroStr = str + "@X127 @E1,0,0,512,0 " + "@D" + detune + " " + "Q16 o5 ";
        for (i = 0; i < nWav13Def; i++) {
            currentAmp = ampList[i];
            // macroStr += "\n\t";
            if (amp != currentAmp) {
                amp = currentAmp;
                macroStr += "@X" + Math.round(128 / amp) + " ";
            }
            macroStr += (i == nWav13Def - 1) && (detune != lastDetune) ? "@D" + lastDetune + " " : "";
            macroStr += "@13-" + (wav13FastNum + i) + " a%";
            macroStr += ((i == nWav13Def - 1) ? lastTick : tick) + " ";
        }
        macroDefs.push({ name: macroName, str: macroStr, str2: "" });
    }

    writeCaption("mmlCaption", "", false);
    // WAV13定義
    for (i = 0; i < nSample; i++) {
        if (i % wav13MaxLen == 0) {
            wav13Str += (i == 0 ? "" : "\n") + "#WAV13 " + (currentWav13Num++) + ",";
        }
        wav13Str += ("0" + out8bitData[i].toString(16).toUpperCase()).substr(-2);
    }
    // 80埋め
    for (i = 0; i < wav13LastLen - (nSample % wav13MaxLen); i++) {
        wav13Str += "80";
    }

    // 再生用マクロ
    // ここ不安
    var macroDefs = new Array();
    var notevalue = getMacroList();
    cancel: for (i = 0; i < notevalue.length; i++) {
        amp = 1.0;
        macroName = macroBaseName + notevalue[i].note;
        macroStr = "@X127 @E1,0,0,512,0 " + "@D" + detune + " " + "Q16 o5 ";
        var number = 0;
        var noteTick = notevalue[i].tick;
        // tickカウントを使い切るかWAV13定義を使い切るまで
        while (true) {
            if (amp != ampList[number]) {
                amp = ampList[number];
                macroStr += "@X" + Math.round(128 / amp) + " ";
            }
            // 最後のWAV13定義
            if (number == nWav13Def - 1) {
                macroStr += lastTick != tick ? "@D" + lastDetune + " " : "";
                // 再生したいtickカウントが収まらないとき PCMを使い切らない
                if (noteTick < lastTick) {
                    macroStr += "@13-" + (wav13FastNum + number) + " a%" + noteTick + " ";
                    noteTick -= noteTick;
                    macroDefs.push({ name: macroName, str: macroStr, str2: "@X0" });
                    break;
                }
                // 収まるとき PCMを使い切る
                else {
                    macroStr += "@13-" + (wav13FastNum + number) + " a%" + lastTick + "";
                    noteTick -= lastTick;
                    macroStr += noteTick != 0 ? " @X0 r%" + noteTick : "";
                    macroDefs.push({ name: macroName, str: macroStr, str2: "" });
                    if(getElement("checkMinMacro").checked){
                        break cancel;
                    }
                    break;
                }
            }
            // 最後のWAV13定義じゃない
            // 残りのtickカウントを使い切らない
            else if (tick < noteTick) {
                macroStr += "@13-" + (wav13FastNum + number) + " a%" + tick + " ";
                noteTick -= tick;
                number++;
            }
            // tickカウントを使い切る
            else {
                macroStr += "@13-" + (wav13FastNum + number) + " a%" + noteTick + "";
                noteTick -= noteTick;
                macroDefs.push({ name: macroName, str: macroStr, str2: "@X0" });
                break;
            }
        }

        if (notevalue[notevalue.length - 1].tick < tickAll) {
            writeCaption("mmlCaption", "PCMが" + notevalue[notevalue.length - 1].name + "に収まらなかった", true);
        }
    }
    macro_allwav13def("_ALL", "");

    var box = getElement("mml");
    box.value = "";

    if (getElement("outMacroDef").checked) {
        for (i = 0; i < macroDefs.length; i++) {
            box.value += "$" + macroDefs[i].name + " = ";
            box.value += macroDefs[i].str + " " + macroDefs[i].str2 + ";\n";
        }
        box.value += "\n";
    }
    if (getElement("outPlayTrack").checked) {
        box.value += "T" + getElement("tempo").value + " ";
        box.value += "@V127 $" + macroDefs[macroDefs.length - 1].name + ";\n\n";
    }
    if (getElement("outWAV13Def").checked) {
        box.value += wav13Str + "\n";
    }
}

function writeCaption(id, text, isError) {
    var element = getElement(id);
    element.textContent = text;
    if (isError) {
        element.style.color = "red";
    }
    else {
        element.style.color = "gray";
    }
}

function getAmpList() {
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nWav13Def = Math.ceil(outData.length / wav13MaxLen);
    var ampList = new Array(nWav13Def);
    for (var i = 0; i < nWav13Def; i++) {
        ampList[i] = Number(getElement("amp-input-" + i).value);
    }

    return ampList;
}

function getMacroList() {
    var macroList = new Array();
    for (var i = 0; i < notevalueDef.length; i++) {
        if (getElement("check" + notevalueDef[i].tick).checked) {
            macroList.push(notevalueDef[i]);
        }
    }
    return macroList;
}

function getElement(elementId) {
    return document.getElementById(elementId);
}

function getRadBtnValue(name) {
    var radBtn = document.getElementsByName(name);
    if (!radBtn) {
        return null;
    }
    for (var i = 0; i < radBtn.length; i++) {
        if (radBtn[i].checked) {
            return radBtn[i].value;
        }
    }
}

function createElement(tagName) {
    return document.createElement(tagName);
}

function myDispatchEvent(elementId, typeArg) {
    getElement(elementId).dispatchEvent(new Event(typeArg));
}

function saveWav(ch, bit, rate, dataL, dataR) {
    var ch = ch;
    // 44 + サンプル数 * bit / 8 * ch
    var buffer = new ArrayBuffer(44 + dataL.length * bit / 8 * ch);
    var view = new DataView(buffer);

    var toInt16 = function (v) {
        var value = Math.round(v);
        if (value < -32768) {
            return -32768;
        }
        if (value > 32767) {
            return 32767;
        }
        return value;
    }

    var toInt8 = function (v) {
        return v;
    }

    view.setUint8(0, 0x52, true);
    view.setUint8(1, 0x49, true);
    view.setUint8(2, 0x46, true);
    view.setUint8(3, 0x46, true);
    view.setUint32(4, 32 + dataL.length * 2, true);
    view.setUint8(8, 0x57, true);
    view.setUint8(9, 0x41, true);
    view.setUint8(10, 0x56, true);
    view.setUint8(11, 0x45, true);
    view.setUint8(12, 0x66, true);
    view.setUint8(13, 0x6D, true);
    view.setUint8(14, 0x74, true);
    view.setUint8(15, 0x20, true);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, ch, true); // とりあえずモノラル
    view.setUint32(24, Math.round(rate), true); // サンプリングレート
    view.setUint32(28, rate * bit / 8 * ch, true); // rate * ushort or uchar * ch
    view.setUint16(32, bit / 8 * ch, true); // ushort or uchar * ch
    view.setUint16(34, bit, true); // bit深度
    view.setUint8(36, 0x64, true);
    view.setUint8(37, 0x61, true);
    view.setUint8(38, 0x74, true);
    view.setUint8(39, 0x61, true);
    view.setUint32(40, dataL.length * bit / 8 * ch, true);
    if (ch == 1) {
        if (bit == 8) {
            for (var i = 0; i < dataL.length; i++) {
                var l = toInt8(dataL[i]);
                view.setInt8(44 + i, l, true);
            }
        } else {
            for (var i = 0; i < dataL.length; i++) {
                var l = toInt16(dataL[i]);
                view.setInt16(44 + i * 2, l, true);
            }
        }

    } else {

    }

    var blob = new Blob([view]);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "output.wav";

    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function convInt16(upper, lower) {
    var value = (upper << 8) + lower;
    if (value & 0x8000) {
        value = ((value - 1) ^ 0xFFFF) * (-1);
    }
    return value;
}

function conv8bit(data, inBit, ampList) {
    var bitconv = 255 / 65535;
    var out8bitData = new Array(data.length);
    var n = 0;

    // console.log(ampList);
    var amp = 1.0;
    for (var i = 0; i < data.length; i++) {
        var d;
        if (i % 1024 == 0) {
            amp = ampList[n++];
        }
        if (inBit == 16) {
            d = outData[i] * amp;
            if (d < -32768) {
                d = -32768;
            }
            if (32767 < d) {
                d = 32767;
            }
            d += 32768;
            d = Math.round(d * bitconv);
        }
        else {
            // d = ((outData[i] - 128) * amp) + 128;
            if (d < 0) {
                d = 0;
            }
            if (d > 255) {
                d = 255;
            }
        }
        out8bitData[i] = d;
    }

    return out8bitData;
}

function normalize(data, inBit) {
    var max = maxAbsSigned(data);
    var amp = (inBit == 16 ? (max < 0 ? -32768 : 32767) : 255) / max;
    for (var i = 0; i < data.length; i++) {
        data[i] *= amp;
    }
    // console.log("Normalize : " + max + " x" + amp + " -> " + maxAbsSigned(data));
}

function calcAmp(data, inBit, wav13MaxLen) {
    var wav13MaxLen = Number(getElement("wav13MaxLen").value);
    var nWav13Def = Math.ceil(data.length / wav13MaxLen);
    var calcAmpList = new Array();
    //                x32    x16   x8    x4     x2
    var threshold = [1024, 2048, 4096, 8192, 16384];

    if (inBit == 8) {
        for (var i = 0; i < nWav13Def; i++) {
            calcAmpList[i] = 1.0
        }
        return calcAmpList;
    }

    for (var i = 0; i < nWav13Def; i++) {
        calcAmpList.push(1.0);
        var max = maxAbs(
            data.slice(
                i * wav13MaxLen,
                i < nWav13Def - 1 ? (i + 1) * wav13MaxLen : data.length)
        );
        for (var j = 0; j < threshold.length; j++) {
            if (max < threshold[j]) {
                calcAmpList[i] = (32768 / threshold[j]);
                break;
            }
        }
    }
    return calcAmpList;
}

function maxAbs(array) {
    var m = Math.abs(array.reduce((a, b) => a > b ? a : b));
    var n = Math.abs(array.reduce((a, b) => a < b ? a : b));
    return m > n ? m : n;
}

function maxAbsSigned(array) {
    var m = Math.abs(array.reduce((a, b) => a > b ? a : b));
    var n = Math.abs(array.reduce((a, b) => a < b ? a : b));
    return m > n ? m : (n * -1);
}

function SamplingRateConv(nWorker) {
    this.nWorker = nWorker;

    this.convNN = function (inRate, outRate, inData, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "nnworker.js");
    }

    this.convLerp = function (inRate, outRate, inData, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "lerpworker.js");
    }

    this.convSinc = function (inRate, outRate, inData, nyquistFreqRetio, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "sincworker.js", -1, -1, -1, nyquistFreqRetio);
    }

    this.convSincHamming = function (inRate, outRate, inData, windowSize, a, nyquistFreqRetio, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "sinchammingworker.js", windowSize, a, -1, nyquistFreqRetio);
    }

    this.convSincBlackman = function (inRate, outRate, inData, windowSize, nyquistFreqRetio, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "sincblackworker.js", windowSize, -1, -1, nyquistFreqRetio);
    }

    this.convSincKaiser = function (inRate, outRate, inData, windowSize, beta, nyquistFreqRetio, onProgress, onConvEnd) {
        conv.call(this, inRate, outRate, inData, onProgress, onConvEnd, "sinckaiserworker.js", windowSize, -1, beta, nyquistFreqRetio);
    }

    function conv(inRate, outRate, inData, onProgress, onConvEnd, workerJS, windowSize, a, beta, nRetio) {
        var self = this;
        var i;
        var nInSample = inData.length;
        var nOutSample = calcNOutSample(nInSample, inRate, outRate);
        var jobs = [];
        var workerProgress = new Array(self.nWorker);

        for (i = 0; i < workerProgress.length; i++) {
            workerProgress[i] = 0;
        }

        for (i = 0; i < self.nWorker; i++) {
            var fromIndex = Math.ceil(nOutSample * i / self.nWorker);
            var toIndex = Math.ceil(nOutSample * (i + 1) / self.nWorker) - 1;
            var worker = new Worker(workerJS);
            var promise = new Promise((resolve, reject) => {
                worker.addEventListener("message", (message) => {
                    if (message.data.type == "progress") {
                        workerProgress[message.data.id] = message.data.progress;
                        var progress = 0;
                        for (var j = 0; j < workerProgress.length; j++) {
                            progress += workerProgress[j] / self.nWorker;
                        }
                        onProgress(progress);
                    } else {
                        resolve(message.data);
                    }
                });
            });

            var sendData = {
                type: "inData",
                inRate: inRate,
                outRate: outRate,
                inData: inData,
                from: fromIndex,
                to: toIndex,
                id: i,

                windowSize: windowSize,
                a: a,
                beta: beta,
                nyquistFreqRetio: nRetio,
            }

            jobs.push(promise);
            worker.postMessage(sendData);
        }
        Promise.all(jobs).then((results) => {
            var outData = new Array();
            for (i = 0; i < results.length; i++) {
                results[i].outData.forEach((element) => {
                    outData.push(element);
                });
            }
            // fixLevel(inData, outData);

            onConvEnd(outData);
        });
    }

    function calcNOutSample(nInSample, inRate, outRate) {
        return Math.ceil(nInSample * (outRate / inRate));
    }

    function fixLevel(inData, outData) {
        var amp = maxAbs(inData) / maxAbs(outData);
        for (var i = 0; i < outData.length; i++) {
            outData[i] *= amp;
        }
    }
}

function onLoad(evt) {
    var onClickac = function (evt) {
        var baseid = evt.target.id.slice(0, 3);
        var content = getElement(baseid + "Content");
        var icon = getElement(baseid + "Icon");
        if (content.classList.contains("ac-content-close")) {
            content.classList.remove("ac-content-close");
            icon.classList.remove("ac-icon-close");
            content.classList.add("ac-content-open");
            icon.classList.add("ac-icon-open");
        } else {
            content.classList.remove("ac-content-open");
            icon.classList.remove("ac-icon-open");
            content.classList.add("ac-content-close");
            icon.classList.add("ac-icon-close");
        }
    };

    getElement("file").addEventListener("change", onChangeFile);
    getElement("convRate").addEventListener("click", onClickConvRate);

    getElement("wav13FastNum").addEventListener("change", onChangeWav13FastNum);
    getElement("wav13FastNum").addEventListener("change", onChangeMMLSettings);
    getElement("macroBaseName").addEventListener("change", onChangeMMLSettings);
    getElement("convBit").addEventListener("click", onClickConvBit);
    getElement("outMacroDef").addEventListener("change", onChangeMMLSettings);
    getElement("outWAV13Def").addEventListener("change", onChangeMMLSettings);
    getElement("outPlayTrack").addEventListener("change", onChangeMMLSettings);
    
    getElement("mml").addEventListener("dblclick", (evt) => { evt.target.select(); })

    getElement("ac1Trigger").addEventListener("click", onClickac);
    getElement("ac2Trigger").addEventListener("click", onClickac);
    getElement("ac3Trigger").addEventListener("click", onClickac);
    getElement("ac4Trigger").addEventListener("click", onClickac);

    getElement("saveWav").addEventListener("click", onClickSaveWav);
    getElement("saveWav8bit").addEventListener("click", onClickSaveWav8bit);

    getElement("concurrency").textContent += navigator.hardwareConcurrency;

    writeMacroList();
}

document.addEventListener("DOMContentLoaded", onLoad);