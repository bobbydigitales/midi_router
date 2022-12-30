"use strict";
const hasMIDISupport = 'requestMIDIAccess' in navigator;
let consoleDiv = null;
let m8 = null;
function log(message) {
    if (!consoleDiv) {
        return;
    }
    consoleDiv.innerText = `${consoleDiv?.innerText}\n${message}`;
}
window.addEventListener('load', main);
async function main() {
    consoleDiv = document.getElementById('console');
    if (!hasMIDISupport) {
        log("No MIDI support :(");
        throw new Error("boom");
    }
    log('MIDI is supported!');
    const midi = await navigator.requestMIDIAccess();
    log(`Number of midi devices detected: ${midi.inputs.size}`);
    let mpk2 = [...midi.inputs.values()].filter((input) => input.name.includes('MPKmini2'))[0];
    m8 = [...midi.outputs.values()].filter((input) => input.name.includes('M8'))[0];
    log(`${mpk2.name}, ${m8.name}`);
    mpk2.addEventListener('midimessage', onMIDIMessage);
}
function onMIDIMessage(message) {
    m8.send(message.data);
    // log(message.data);
}
