const hasMIDISupport = 'requestMIDIAccess' in navigator;
let consoleDiv:HTMLDivElement|null = null;
let m8:any = null;

function log(message:string) {
    if (!consoleDiv) {
        return;
    }
    consoleDiv.innerText = `${consoleDiv?.innerText}\n${message}`
}

window.addEventListener('load', main);

async function main() {
    consoleDiv = document.getElementById('console') as HTMLDivElement;

    if (!hasMIDISupport) {
        log("No MIDI support :(")
        throw new Error("boom");
    }

    log('MIDI is supported!');

    const midi = await (navigator as any).requestMIDIAccess();

    log(`Number of midi devices detected: ${midi.inputs.size}`);

    let mpk2 =  [...midi.inputs.values()].filter((input:any)=>input.name.includes('MPKmini2'))[0];
    m8 = [...midi.outputs.values()].filter((input:any)=>input.name.includes('M8'))[0];

    log(`${mpk2.name}, ${m8.name}`);

    mpk2.addEventListener('midimessage', onMIDIMessage);
}

function onMIDIMessage(message:any){
    m8.send(message.data);
    // log(message.data);
}