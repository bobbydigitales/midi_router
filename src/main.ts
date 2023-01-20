const hasMIDISupport = 'requestMIDIAccess' in navigator;
let consoleDiv:HTMLDivElement|null = null;
let consoleText:string[] = [];
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
    private _inputs:any[] = [];
    private _outputs:any[] = [];
    midi:null|any = null;
    log:any = null;
    m8:any = null;
    renderCallback:any = null;
    private routes:Map<string, any> = new Map();
    private nameToOutput:Map<string, any> = new Map();
    savedRoutes:Map<string, string> = new Map();

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

    async init(logger:any, renderCallback:Function) {
        this.midi = await (navigator as any).requestMIDIAccess();
        if (!this.midi) {
            return "Couldn't get MIDI access :(";
        }
        this.log = logger;
        this.renderCallback = renderCallback;
        
        this.midi.addEventListener('statechange', this.onStateChanged.bind(this));
        this.updateConnections();
    }

    updateConnections() {
        this._inputs = [...this.midi.inputs.values()];
        this._outputs = [...this.midi.outputs.values()];

        for (let input of this._inputs) {
            input.onmidimessage = (message:any)=>this.onMIDIMessage(message);
            let savedRoute = this.savedRoutes.get(input.name);
            if (savedRoute) {
                this.log(`Restoring saved route: ${input.name}->${savedRoute}`);
                this.updateRoutes(`${input.name},${savedRoute}`);
            }
        }

        for (let output of this._outputs) {
            this.nameToOutput.set(output.name, output);
        }

        this.renderCallback(this);
    }

    onStateChanged(message:{port:{manufacturer:string, name:string, type:string, state:string}}) {
        let port = message.port;
        this.log(`MIDI device ${port.state}: ${port.manufacturer} ${port.name} ${port.type}`);
        this.updateConnections();
  
    }

    onMIDIMessage(message:any) {
        let inputName = message.target.name;
        // this.m8.send(message.data);

        let output = this.routes.get(inputName);
        if (output) {
            output.send(message.data);
        }

        let data = message.data;
        let statusByte = data[0]>>4;
        
        let messageType = this.messageMap.get(statusByte);
        let channel = (message.data[0] & 0b00001111) + 1;
        let noteNumber = data[1];
        let velocity = data[2];
        

        this.log(`${message.target.name}: ${messageType} ${channel} ${noteNumber} ${velocity}`);
    }

    updateRoutes(route:string) {
        let [inputName, outputName] = route.split(',');
        
        log(`ROUTING ${inputName} to ${outputName}`);

        this.routes.set(inputName, this.nameToOutput.get(outputName));

        let saveArray = [];

        for (let [inputName, output] of this.routes) {
            if (!output) {
                continue;
            }
            saveArray.push([inputName, output.name]);
        }
        localStorage.setItem('MIDIRouter', JSON.stringify(saveArray));

    }

    restoreRoutesFromLocalStorage() {
        let savedRoutes = localStorage.getItem('MIDIRouter');
        if (!savedRoutes) {
            return;
        }

        this.savedRoutes = new Map(JSON.parse(savedRoutes));
        console.log(this.savedRoutes);
    }

    getRoute(inputName:string) {
        return this.routes.get(inputName);
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

    await router.init(log, render);

    router.restoreRoutesFromLocalStorage();

    // render(router);
    // log(`inputs: ${router.inputs.map((input:any)=>input.name)}`);
    // log(`outputs: ${router.outputs.map((output:any)=>output.name)}`);
}


// TODO - replace this with preact or something.
function render(router:MIDIRouter) {
    if (router.inputs && router.outputs) {
        log(`Inputs: ${router.inputs.map((input:any)=>input.name)}`)
        log(`Outputs: ${router.outputs.map((output:any)=>output.name)}`)
    }
    let routerElement = document.getElementById('router');
    if (!routerElement) {
        throw new Error(`couldn't create router control`);
    }

    // @ts-ignore
    routerElement.replaceChildren();

    let disabled = document.createElement('option');
    disabled.text = "Disabled";
    disabled.value = "disabled";

    for (let input of router.inputs) {
        let container = document.createElement('div');

        let inputLabel = document.createElement('span');
        inputLabel.innerText = `${input.name}:`;
        container.appendChild(inputLabel);

        let dropDown = document.createElement('select');
        dropDown.addEventListener('change', (message)=>{router.updateRoutes((message.target as any).value)});
        let disabledInput = disabled.cloneNode(true) as HTMLOptionElement;
        disabledInput.value = `${input.name},disabled`;
        dropDown.add(disabledInput);

        let routeName = router.getRoute(input.name)?.name;
        for (let output of router.outputs) {
            if (output.name === input.name) {
                continue;
            }

            let option = document.createElement('option');
            option.value = `${input.name},${(output as any).name}`;
            option.text = (output as any).name;
            if (output.name === routeName) {
                option.selected = true;
            }
            dropDown.add(option);
        }

        container.appendChild(dropDown);
        routerElement.appendChild(container);
    }
}