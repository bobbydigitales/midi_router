const hasMIDISupport = 'requestMIDIAccess' in navigator;
let consoleDiv:HTMLDivElement|null = null;
let consoleText:string[] = new Array(20);
// let m8:any = null;

function log(message:string) {
    consoleText.push(`${performance.now().toFixed(2).padEnd(20, " ")}: ${message}`);
    if (consoleText.length>20) {
        consoleText = consoleText.slice(consoleText.length-20, consoleText.length);
    }

    if (!consoleDiv) {
        return;
    }

    consoleDiv.innerText = consoleText.join('\n');
}

window.addEventListener('load', main);

class MIDIRouter {
    private _inputs:any = null;
    private _outputs:any = null;
    midi:null|any = null;
    log:any = null;
    m8:any = null;

    get inputs() {
        return this._inputs;
    }

    get outputs() {
        return this._outputs;
    }

    messageMap = new Map([
        [0x8, "Note Off"],
        [0x9, "Note On"],
        [0xA, "Poly Aftertouch"],
        [0xB, "Control Change"],
        [0xC, "Program Change"],
        [0xD, "Channel Aftertouch"],
        [0xE, "Pitch wheel"],
    ])

    constructor() {
    }

    async init(logger:any) {
        this.midi = await (navigator as any).requestMIDIAccess();
        if (!this.midi) {
            return "Couldn't get MIDI access :(";
        }
        
        this.midi.addEventListener('statechange', this.onStateChanged.bind(this));

        this.log = logger;

        this._inputs = [...this.midi.inputs.values()];
        this._outputs = [...this.midi.outputs.values()];

        let onMIDIMessage = this.onMIDIMessage.bind(this);
        for (let input of this._inputs) {
            input.addEventListener('midimessage',onMIDIMessage);
        }

        // let mpk2 =  this._inputs.filter((input:any)=>input.name.includes('MPKmini2'))[0];
        // this.m8 = this._outputs.filter((input:any)=>input.name.includes('M8'))[0];
        // let m8in = [...this.inputs].filter((input:any)=>input.name.includes('M8'))[0];
        // log(`${mpk2.name}, ${m8.name}`);
    
        // arturia.addEventListener('midimessage', onMIDIMessage);
        // mpk2.addEventListener('midimessage', this.onMIDIMessage.bind(this));
        // m8in.addEventListener('midimessage', this.onMIDIMessage.bind(this));
    }

    onStateChanged(message:{port:{manufacturer:string, name:string, type:string, state:string}}) {
        let port = message.port;
        this.log(`MIDI device ${port.state}: ${port.manufacturer} ${port.name} ${port.type}`);
    }

    onMIDIMessage(message:any) {
        // this.m8.send(message.data);
        let data = message.data;
        let statusByte = data[0]>>4;
        
        let messageType = this.messageMap.get(statusByte);
        let channel = (message.data[0] & 0b00001111) + 1;
        let noteNumber = data[1];
        let velocity = data[2];
        

        this.log(`${message.target.name}: ${messageType} ${channel} ${noteNumber} ${velocity}`);
    }
}

async function main() {
    consoleDiv = document.getElementById('console') as HTMLDivElement;

    if (!hasMIDISupport) {
        log("No MIDI support :(")
        throw new Error("boom");
    }

    log('MIDI is supported!');

    const router = new MIDIRouter();

    await router.init(log);

    log(`Inputs: ${router.inputs.map((input:any)=>input.name)}`)
    log(`Outputs: ${router.outputs.map((output:any)=>output.name)}`)
    render(router);
    // log(`inputs: ${router.inputs.map((input:any)=>input.name)}`);
    // log(`outputs: ${router.outputs.map((output:any)=>output.name)}`);
}


function render(router:MIDIRouter) {
    let routerElement = document.getElementById('router');
    if (!routerElement) {
        throw new Error(`couldn't create router control`);
    }

    // @ts-ignore
    routerElement.replaceChildren();

    for (let input of router.inputs) {
        let container = document.createElement('div');

        let enabled = document.createElement('input');
        enabled.type = 'checkbox';
        enabled.style.marginRight = '20px';
        container.appendChild(enabled);
        
        let inputLabel = document.createElement('span');
        inputLabel.innerText = `${input.name}:`;
        container.appendChild(inputLabel);

        let dropDown = document.createElement('select');
        for (let output of router.outputs) {
            if (output.name === input.name) {
                continue;
            }

            let option = document.createElement('option');
            option.value = (output as any).name;
            option.text = (output as any).name;
            dropDown.add(option);
        }

        container.appendChild(dropDown);
        routerElement.appendChild(container);
    }
}