import { Scene, Node, DirectionalLight, HemisphericLight, Tools, IParticleSystem } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

export interface BehaviorCode {
    code: string;
    name: string;
    active: boolean;
}

export interface BehaviorMetadata {
    node: string;
    metadatas: BehaviorCode[];
}

const template = `
EDITOR.BehaviorCode.Constructors['{{name}}'] = function (scene, {{node}}) {
    {{code}}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class BehaviorCode {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].BehaviorCode = EDITOR.BehaviorCode;

// Code extension class
export default class CodeExtension extends Extension<BehaviorMetadata[]> {
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: BehaviorMetadata[]): void {
        this.datas = data;

        // For each node
        this.datas.forEach(d => {
            let node: Scene | Node | IParticleSystem = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);

            if (!node)
                this.scene.particleSystems.forEach(ps => ps.name === d.node && (node = ps));
            
            if (!node)
                return;

            d.metadatas.forEach(m => {
                if (!m.active)
                    return;

                let url = window.location.href;
                url = url.replace(Tools.GetFilename(url), '') + 'behaviors/' + (node instanceof Scene ? 'scene/' : node.name.replace(/ /g, '') + '/') + m.name.replace(/ /g, '') + '.js';

                const fnName = (node instanceof Scene ? 'scene' : node.name.replace(/ /g, '')) + m.name.replace(/ /g, '');

                // Create script tag
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.text = template
                              .replace('{{name}}', fnName)
                              .replace('{{node}}', this._getConstructorName(node))
                              .replace('{{code}}', m.code)
                              + '\n' + '//# sourceURL=' + url + '\n'
                document.head.appendChild(script);

                // Create instance
                const instance = new EDITOR.BehaviorCode.Constructors[fnName](this.scene, node);
                const scope = this;

                if (instance.start) {
                    this.scene.registerBeforeRender(function () {
                        instance.start();
                        scope.scene.unregisterBeforeRender(this.callback);
                    });
                }

                if (instance.update) {
                    this.scene.registerBeforeRender(function () {
                        instance.update();
                    });
                }
            });
        });
    }
    
    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): BehaviorMetadata[] {
        const result: BehaviorMetadata[] = [];
        const add = (objects: (Scene | Node | IParticleSystem)[]) => {
            objects.forEach(o => {
                if (o['metadata'] && o['metadata']['behavior'])
                    result.push(o['metadata']['behavior']);
            });
        };

        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);
        add([this.scene]);
        add(this.scene.particleSystems);

        return result;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: BehaviorMetadata[]): void {
        this.datas = data;
        
        // For each node
        this.datas.forEach(d => {
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
            if (!node)
                return;
            
            node.metadata = node.metadata || { };
            node.metadata['behavior'] = d;
        });
    }

    // Returns the name of the "obj" constructor
    private _getConstructorName(obj: any): string {
        if (obj instanceof DirectionalLight)
            return "dirlight";

        if (obj instanceof HemisphericLight)
            return "hemlight";

        let ctrName = (obj && obj.constructor) ? (<any>obj.constructor).name : "";
        
        if (ctrName === "") {
            ctrName = typeof obj;
        }
        
        return ctrName.toLowerCase();
    }
}

// Register
Extensions.Register('BehaviorExtension', CodeExtension);