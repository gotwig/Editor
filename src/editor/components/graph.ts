import {
    Scene, Node, Mesh, AbstractMesh, Light, Camera, InstancedMesh,
    Sound,
    ParticleSystem, GPUParticleSystem, IParticleSystem,
    PostProcess,
    Tools as BabylonTools
} from 'babylonjs';
import { AdvancedDynamicTexture, Image } from 'babylonjs-gui';

import Editor from '../editor';
import Tools from '../tools/tools';
import Graph, { GraphNode } from '../gui/graph';
import SceneFactory from '../scene/scene-factory';

export default class EditorGraph {
    // Public members
    public graph: Graph;
    public root: string = 'ROOT';
    public gui: string = 'GUI';

    public currentObject: any = this.editor.core.scene;

    /**
     * Constructor
     * @param editor the editor reference
     */
    constructor(protected editor: Editor) {
        // Build graph
        this.graph = new Graph('SceneGraph');
        this.graph.topContent = '<div style="background-color: #eee; padding: 10px 5px; border-bottom: 1px solid silver">Scene Content</div>'
        this.graph.build('SCENE-GRAPH');
        $('#SCENE-GRAPH').hide();

        // Add menus
        this.graph.addMenu({ id: 'remove', text: 'Remove', img: 'icon-error' });
        this.graph.addMenu({ id: 'clone', text: 'Clone', img: 'icon-clone' });

        // Events
        this.graph.onClick = (id, data: any) => {
            this.currentObject = data;
            this.editor.core.onSelectObject.notifyObservers(data);
        };
        this.graph.onMenuClick = (id, node) => this.onMenuClick(id, node);

        this.editor.core.onSelectObject.add((node: Node) => node && this.select(node.id));
    }

    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    public renameNode (id: string, name: string): void {
        const node = <GraphNode>this.graph.element.get(id);
        node.id = name;
        node.text = name;

        this.graph.element.refresh();
    }

    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    public setParent (id: string, parentId: string): void {
        const parent = <GraphNode>this.graph.element.get(parentId);
        const node = <GraphNode>this.graph.element.get(id);

        parent.count = parent.count ? parent.count++ : 1;

        this.graph.element.remove(node.id);
        this.graph.element.add(parent.id, node);
        this.graph.element.expandParents(node.id);
    }

    /**
     * Adds a new node
     * @param node: the node to add
     * @param parentId: the parent id of the node to add
     */
    public add (node: GraphNode, parentId: string): void {
        this.graph.element.add(parentId, node);
    }

    /**
     * Selects the given node id
     * @param id the node id
     */
    public select (id: string): void {
        this.graph.element.expandParents(id);
        this.graph.element.select(id);
        this.graph.element.scrollIntoView(id);
    }

    /**
     * Returns the selected node id
     */
    public getSelected (): GraphNode {
        return <GraphNode> this.graph.element.get(this.graph.element.selected);
    }

    /**
     * Returns a anode 
     * @param data: the data to search
     */
    public getByData (data: any): GraphNode {
        return <GraphNode> this.graph.element.get(data.id || data.name);
    }

    /**
     * Clears the graph
     */
    public clear (): void {
        this.graph.clear();
    }

    /**
     * Fills the graph
     * @param scene: the root scene
     * @param root: the root node
     */
    public fill(scene: Scene = this.editor.core.scene, root?: Node): void {
        let nodes = root ? root.getDescendants() : [];

        if (!root) {
            // Set scene's node
            this.graph.element.add(<GraphNode> {
                id: this.root,
                text: 'Scene',
                img: 'icon-scene',
                data: scene
            });
            
            this.graph.element.expand(this.root);
            this.graph.element.select(this.root);
            this.editor.edition.setObject(scene);

            // Sort nodes alphabetically
            Tools.SortAlphabetically(scene.cameras, 'name');
            Tools.SortAlphabetically(scene.lights, 'name');
            Tools.SortAlphabetically(scene.meshes, 'name');

            // Set nodes
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.meshes.forEach(m => !m.parent && nodes.push(m));

            // Set sounds
            this.fillSounds(scene, scene);

            // Set gui's node
            // TODO: wait for parse and serialize for GUI
            // this.graph.element.add(<GraphNode> {
            //     id: this.gui,
            //     text: 'GUI',
            //     img: 'icon-lens-flare',
            //     data: scene
            // });

            // this.fillGuiTextures(null);
        }
        else {
            Tools.SortAlphabetically(nodes, 'name');
        }

        // Add nodes
        nodes.forEach(n => {
            // Create a random ID if not defined
            if (!n.id)
                n.id = BabylonTools.RandomId();

            // Instance?
            const parent = root ? root.id : this.root;
            const parentNode = <GraphNode> this.graph.element.add(parent, <GraphNode>{
                id: n.id,
                text: n.name,
                img: this.getIcon(n),
                data: n
            });

            // Cannot add
            if (!parentNode)
                return;

            // Sub meshes
            if (n instanceof AbstractMesh && n.subMeshes && n.subMeshes.length > 1) {
                parentNode.count += n.subMeshes.length;
                n.subMeshes.forEach((sm, index) => {
                    this.graph.element.add(n.id, <GraphNode>{
                        id: n.id + 'submesh_' + index,
                        text: sm.getMaterial().name,
                        img: this.getIcon(n),
                        data: sm
                    });
                });
            }

            // Check particle systems
            scene.particleSystems.forEach(ps => {
                if (ps.emitter === n) {
                    parentNode.count++;
                    this.graph.element.add(n.id, <GraphNode>{
                        id: ps.id,
                        text: ps.name,
                        img: this.getIcon(ps),
                        data: ps
                    });
                }
            });

            // Check lens flares
            scene.lensFlareSystems.forEach(lf => {
                if (lf.getEmitter() === n) {
                    parentNode.count++;
                    this.graph.element.add(n.id, <GraphNode> {
                        id: lf.id,
                        text: lf.name,
                        img: this.getIcon(lf),
                        data: lf
                    });
                }
            });

            // Camera? Add post-processes
            if (n instanceof Camera) {
                n._postProcesses.forEach(p => {
                    parentNode.count++;
                    this.graph.element.add(n.id, <GraphNode> {
                        id: p.name,
                        text: p.name,
                        img: this.getIcon(p),
                        data: p
                    });
                });
            }

            // Sounds
            parentNode.count += this.fillSounds(scene, n);

            // TODO: wait for parse and serialize for GUI
            // parentNode.count += this.fillGuiTextures(n);

            // Add descendants to count
            const descendants = n.getDescendants();
            if (descendants.length)
                parentNode.count += descendants.length;

            // Fill descendants
            this.fill(scene, n);
        });
    }

    /**
    * Returns the icon related to the object type
    * @param object 
    */
    public getIcon(obj: any): string {
        if (obj instanceof AbstractMesh) {
            return 'icon-mesh';
        } else if (obj instanceof Light) {
            return 'icon-light';
        } else if (obj instanceof Camera) {
            return 'icon-camera';
        } else if (obj instanceof ParticleSystem || obj instanceof GPUParticleSystem) {
            return 'icon-particles';
        } else if (obj instanceof PostProcess) {
            return 'icon-helpers';
        } else if (obj instanceof Sound) {
            return 'icon-sound';
        } else if (obj instanceof AdvancedDynamicTexture) {
            return 'icon-ground';
        } else if (obj instanceof Image) {
            return 'icon-dynamic-texture';
        }

        return null;
    }

    /**
     * Fills the sounds giving the scene and the root node (attached mesh or scene)
     * @param scene: the scene containing the sound
     * @param root: the root node to check
     */
    protected fillSounds (scene: Scene, root: Scene | Node): number {
        // Set sounds
        if (scene.soundTracks.length === 0 || scene.soundTracks[0].soundCollection.length === 0)
            return;

        let count = 0;

        scene.soundTracks.forEach(st => {
            st.soundCollection.forEach(s => {
                if (root === scene && !s['_connectedMesh']) {
                    this.graph.element.add(this.root, <GraphNode>{
                        id: s.name,
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    });
                }
                else if (s['_connectedMesh'] === root) {
                    this.graph.element.add((<Node> root).id, <GraphNode>{
                        id: s.name,
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    });

                    count++;
                }
            });
        });

        return count;
    }

    /**
     * Fills the GUI advanced textures
     * @param root: the node to check GUI is attached to
     */
    protected fillGuiTextures (root: Node): number {
        let count = 0;

        if (!root) {
            // Advanced ui textures
            this.editor.core.uiTextures.forEach(ut => {
                this.graph.element.add(this.gui, <GraphNode>{
                    id: ut.name,
                    text: ut.name,
                    img: this.getIcon(ut),
                    data: ut
                });
            });
        }
        else {
            // Attached to mesh
            this.editor.core.uiTextures.forEach(ut => {
                
            });
        }

        return count;
    }

    /**
     * On the user clicks on a context menu item
     * @param id the context menu item id
     * @param node the related graph node
     */
    protected onMenuClick (id: string, node: GraphNode): void {
        switch (id) {
            // Remove
            case 'remove':
                node.data && node.data.dispose && node.data.dispose();
                this.graph.element.remove(node.id);

                // Gui
                if (node.data instanceof AdvancedDynamicTexture) {
                    const ui = this.editor.core.uiTextures.find(ut => ut === node.data);
                    const index = this.editor.core.uiTextures.indexOf(ui);

                    if (index !== -1)
                        this.editor.core.uiTextures.splice(index, 1);
                }
                break;
            // Clone
            case 'clone':
                if (!node || !(node.data instanceof Node))
                    return;
                
                const clone = node && node.data && node.data['clone'] && node.data['clone']();
                clone.name = node.data.name + ' Cloned';
                clone.id = BabylonTools.RandomId();

                const parent = clone.parent ? clone.parent.id :this.root;
                this.graph.add({ id: clone.id, text: clone.name, img: this.getIcon(clone), data: clone }, parent);
                
                // Setup this
                this.currentObject = clone;
                this.editor.core.onSelectObject.notifyObservers(clone);
                break;
            // Other
            default:
                break;
        }
    }
}
