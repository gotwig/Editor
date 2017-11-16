import {
    FilesInput, Tools as BabylonTools,
    SceneSerializer,
    Node, AbstractMesh, Light, Camera,
    Tags,
    Vector3,
    ActionManager
} from 'babylonjs';

import { IStringDictionary } from '../typings/typings';

import SceneManager from './scene-manager';
import Tools from '../tools/tools';
import Editor from '../editor';
import Extensions from '../../extensions/extensions';

import * as Export from '../typings/project';
import Storage, { CreateFiles } from '../storage/storage';

const randomId = BabylonTools.RandomId();

export default class ProjectExporter {
    // Static members
    public static ProjectPath: string = ''; // TODO: manage selected project path + CTRL+S

    /**
     * Creates a new file
     * @param editor: the editor instance
     */
    public static CreateFiles (editor: Editor): void {
        // Scene
        const serializedScene = SceneSerializer.Serialize(editor.core.scene);
        let file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
        editor.sceneFile = file;

        // Project
        const name = 'scene' + randomId + '.editorproject';
        const project = this.Export(editor);
        file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(project)), name);
        editor.projectFile = file;
    }

    /**
     * Uploads all scene templates
     * @param editor the editor reference
     */
    public static async ExportTemplate (editor: Editor): Promise<void> {
        this.CreateFiles(editor);

        // Create files
        const sceneFiles: CreateFiles[] = [{ name: 'scene.babylon', data: await Tools.ReadFileAsArrayBuffer(editor.sceneFile) }];
        Object.keys(FilesInput.FilesToLoad).forEach(async k => sceneFiles.push({ name: k, data: await Tools.ReadFileAsArrayBuffer(FilesInput.FilesToLoad[k]) }));

        // Src files
        const srcFiles: CreateFiles[] = [
            { name: 'game.ts', data: await Tools.LoadFile<string>('assets/templates/template/src/game.ts') }
        ];

        const storage = await this.GetStorage(editor);
        storage.openPicker('Create Template', [
            { name: 'Scene', folder: sceneFiles },
            { name: 'src', folder: srcFiles },
            { name: 'README.md', data: await Tools.LoadFile<string>('assets/templates/template/README.md') },
            { name: 'index.html', data: await Tools.LoadFile<string>('assets/templates/template/index.html') },
            { name: 'package.json', data: await Tools.LoadFile<string>('assets/templates/template/package.json') },
            { name: 'tsconfig.json', data: await Tools.LoadFile<string>('assets/templates/template/tsconfig.json') }
        ]);
    }

    /**
     * Returns the appropriate storage (OneDrive, Electron, etc.)
     * @param editor the editor reference
     */
    public static async GetStorage (editor: Editor): Promise<Storage> {
        const storage = Tools.isElectron()
            ? await Tools.ImportScript<any>('.build/src/editor/storage/electron-storage.js')
            : await Tools.ImportScript<any>('.build/src/editor/storage/one-drive-storage.js');

        return new storage.default(editor);
    }

    /**
     * Exports the current editor project
     */
    public static Export (editor: Editor): Export.ProjectRoot {
        // Toggle scene manager
        SceneManager.Toggle(editor.core.scene);

        const project: Export.ProjectRoot = {
            actions: null,
            customMetadatas: this._SerializeCustomMetadatas(editor),
            globalConfiguration: null,
            lensFlares: null,
            materials: this._SerializeMaterials(editor),
            nodes: this._SerializeNodes(editor),
            particleSystems: this._SerializeParticleSystems(editor),
            physicsEnabled: editor.core.scene.isPhysicsEnabled(),
            postProcesses: null,
            renderTargets: null,
            requestedMaterials: null,
            shadowGenerators: this._SerializeShadowGenerators(editor),
            sounds: null
        };

        // Finish
        SceneManager.Toggle(editor.core.scene);

        return project;
    }

    /**
     * Serializes the custom metadatas
     */
    private static _SerializeCustomMetadatas (editor: Editor): IStringDictionary<any> {
        const result = { };

        // Instances have been 
        for (const e in Extensions.Instances)
            result[e] = Extensions.Instances[e].onSerialize();

        return result;
    }

    /**
     * Serializes the shadow generators
     */
    private static _SerializeShadowGenerators (editor: Editor): any[] {
        const result = [];

        editor.core.scene.lights.forEach(l => {
            const sg = l.getShadowGenerator();
            if (!sg || !Tags.HasTags(sg) || !Tags.MatchesQuery(sg, 'added'))
                return;

            result.push(sg.serialize());
        });

        return result;
    }

    /**
     * Serializes the Materials
     */
    private static _SerializeMaterials (editor: Editor): Export.ProjectMaterial[] {
        const scene = editor.core.scene;
        const result: Export.ProjectMaterial[] = [];

        scene.materials.forEach(m => {
            if (!Tags.HasTags(m) || !Tags.MatchesQuery(m, 'added'))
                return;

            // Already serialized?
            const material = result.find(mat => mat.serializedValues.name === m.name);
            if (material)
                return;

            // Add new material
            const names: string[] = [];
            scene.meshes.map(mesh => {
                if (mesh.material === m)
                    names.push(mesh.name);
            });

            result.push({
                meshesNames: names,
                newInstance: true,
                serializedValues: m.serialize()
            });
        });

        return result;
    }

    /**
     * Serializes the Particle Systems
     */
    private static _SerializeParticleSystems (editor: Editor): Export.ParticleSystem[] {
        const scene = editor.core.scene;
        const result: Export.ParticleSystem[] = [];

        scene.particleSystems.forEach(ps => {
            if (!Tags.HasTags(ps) || !Tags.MatchesQuery(ps, 'added'))
                return;
            
            result.push({
                emitterPosition: (ps.emitter && ps.emitter instanceof Vector3) ? ps.emitter.asArray() : null,
                hasEmitter: ps.emitter && ps.emitter instanceof AbstractMesh,
                serializationObject: ps.serialize()
            });
        });

        return result;
    }

    /**
     * Serializes the nodes
     */
    private static _SerializeNodes (editor: Editor): Export.Node[] {
        const scene = editor.core.scene;
        const nodes = (<(Node)[]> [])
            .concat(scene.meshes)
            .concat(scene.lights)
            .concat(scene.cameras)
            .filter(n => n !== editor.camera);

        const result: Export.Node[] = [];

        nodes.forEach((n: Node) => {
            let addNodeToProject = false;

            const node: Export.Node = {
                actions: null,
                animations: [],
                id: n.id,
                name: n.name,
                serializationObject: null,
                physics: null,
                type: n instanceof AbstractMesh ? 'Mesh' :
                      n instanceof Light ? 'Light' :
                      n instanceof Camera ? 'Camera' : 'Unknown!'
            };

            if (Tags.HasTags(n) && Tags.MatchesQuery(n, 'added')) {
                addNodeToProject = true;

                if (n instanceof AbstractMesh)
                    node.serializationObject = SceneSerializer.SerializeMesh(n, false, false);
                else
                    node.serializationObject = (<Camera | Light> n).serialize();
            }

            // Animations
            n.animations.forEach(a => {
                if (!Tags.HasTags(a) || !Tags.MatchesQuery(a, 'added'))
                    return;
                
                addNodeToProject = true;

                node.animations.push({
                    events: [],
                    serializationObject: a.serialize(),
                    targetName: name,
                    targetType: 'Node'
                });
            });

            // Physics
            if (n instanceof AbstractMesh) {
                const impostor = n.getPhysicsImpostor();
                if (impostor && Tags.HasTags(impostor) && Tags.MatchesQuery(impostor, 'added')) {
                    addNodeToProject = true;

                    node.physics = {
                        physicsMass: impostor.getParam("mass"),
                        physicsFriction: impostor.getParam("friction"),
                        physicsRestitution: impostor.getParam("restitution"),
                        physicsImpostor: impostor.type
                    };
                }
            }

            // Actions
            const actionManager: ActionManager = n['actionManager'];
            if (actionManager && Tags.HasTags(actionManager) && Tags.MatchesQuery(actionManager, 'added')) {
                addNodeToProject = true;
                node.actions = actionManager.serialize(name);
            }

            // Add to nodes project?
            if (addNodeToProject)
                result.push(node);
        });

        return result;
    }
}
