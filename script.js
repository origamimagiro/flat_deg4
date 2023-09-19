const ins = [
    {id: "a", x: 10, y: 10, min: 1, max: 999, step: 1, val: 500},
    {id: "b", x: 10, y: 30, min: 1, max: 999, step: 1, val: 999},
    {id: "r", x: 10, y: 50, min: 1, max: 999, step: 1, val: 500},
];

const make = () => {
    const [va, vb, vr] = ins.map(I => I.val);
    const a = va/2/1000*Math.PI;
    const b = (Math.PI/2 - a)*vb/1000 + a;
    const r = (vr/1000 - 0.5)*2*Math.PI;
    const A = [0, a, a + b, b + Math.PI, 2*Math.PI];
    const U = A.map(ang => [Math.cos(ang), Math.sin(ang), 0]);
    const CA = [1, 3, 5, 7].map(p => p*Math.PI/4);
    const C = CA.map(ang => {
        const s = 2**0.5;
        return [s*Math.cos(ang), s*Math.sin(ang), 0];
    });
    const V = A.map(ang => {
        const t = Math.tan(ang);
        switch (Math.floor(ang/Math.PI*4)) {
            case 0: case 7: return [   1,  t, 0];
            case 1: case 2: return [ 1/t,  1, 0];
            case 3: case 4: return [  -1, -t, 0];
            case 5: case 6: return [-1/t, -1, 0];
        }
    });
    const o = [0, 0, 0];
    const FV = [0, 1, 2, 3].map(i => {
        const F = [o, V[i]];
        const eps = 0.001;
        for (let j = 0; j < 4; ++j) {
            if ((A[i] < CA[j] - eps) && ((CA[j] + eps) < A[i + 1])) {
                F.push(C[j]);
            }
        }
        F.push(V[(i + 1) % 4]);
        return F;
    });
    const c1 = Math.cos((a + b)/2);
    const c2 = Math.cos((a - b)/2);
    const r1 = 2*Math.atan(-c1/c2*Math.tan(r/2));
    const R1 = [r, r1, r, -r1];
    const s1 = Math.sin((a + b)/2);
    const s2 = Math.sin((a - b)/2);
    const r2 = 2*Math.atan(s1/s2*Math.tan(r/2));
    const R2 = [r, r2, -r, r2];
    const R = (r < 0) ? R1 : R2;
    for (let i = 1; i < 4; ++i) {
        for (let j = i; j < 4; ++j) {
            FV[j] = FV[j].map(p => rotate(p, U[i], R[i]));
        }
        for (let j = i + 1; j < 4; ++j) {
            U[j] = rotate(U[j], U[i], R[i]);
        }
    }
    const FC = [0xff0000, 0x00ff00, 0xff00ff, 0x00ffff];
    return [FV, FC];
};

const rotate = ([px, py, pz], [ux, uy, uz], a) => {
    const [s, c, d] = [Math.sin(a), Math.cos(a), 1 - Math.cos(a)];
    const x = px*(ux*ux*d +    c) + py*(ux*uy*d - uz*s) + pz*(ux*uz*d + uy*s);
    const y = px*(uy*ux*d + uz*s) + py*(uy*uy*d +    c) + pz*(uy*uz*d - ux*s);
    const z = px*(uz*ux*d - uy*s) + py*(uz*uy*d + ux*s) + pz*(uz*uz*d +    c);
    return [x, y, z];
};

/***************************************/
import * as THREE from 'three';

const setup = () => {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    const [w, h] = [window.innerWidth, window.innerHeight];
    const scene = new THREE.Scene();
    const s = 3;
    const camera = new THREE.OrthographicCamera(-s, s, s*h/w, -s*h/w, 0, 2*s);
    camera.position.z = s;
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);
    renderer.setClearColor(0xBBBBBB);
    document.body.appendChild(renderer.domElement);

    let mouse = undefined;
    let change = undefined;

    const update = () => {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        if (change != undefined) {
            const [dx, dy] = change.map(a => a*Math.PI/180);
            const rotation = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(dy, dx, 0, 'XYZ'));
            scene.quaternion.multiplyQuaternions(rotation, scene.quaternion);
        }
        const [FV, FC] = make();
        for (let i = 0; i < FV.length; ++i) {
            const [P, color] = [FV[i], FC[i]];
            const shape = new THREE.Shape(P.map(([x, y, z]) => {
                return new THREE.Vector2(x, y);
            }));
            const poly = new THREE.ShapeGeometry(shape);
            const verts = new THREE.Float32BufferAttribute(P.flat(), 3);
            poly.setAttribute("position", verts);
            const ops = {side: THREE.DoubleSide, color: color};
            const material = new THREE.MeshBasicMaterial(ops);
            const mesh = new THREE.Mesh(poly, material);
            scene.add(mesh);
        }
        renderer.render(scene, camera);
    };

    renderer.domElement.onmousedown = (e) => {
        mouse = [e.offsetX, e.offsetY];
        update();
    };

    renderer.domElement.onmouseup = (e) => {
        mouse = undefined;
        update();
    };

    renderer.domElement.onmousemove = (e) => {
        if (mouse == undefined) { return; }
        change = [e.offsetX - mouse[0], e.offsetY - mouse[1]];
        mouse = [e.offsetX, e.offsetY];
        update();
    };

    for (const I of ins) {
        const {id, x, y, min, max, step, val} = I;
        const input = document.createElement("input");
        input.style = `position: absolute; left: ${x}px; top: ${y}px;`;
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = val;
        input.id = "input_" + id;
        document.body.append(input);
        input.oninput = () => {
            I.val = +document.getElementById("input_" + I.id).value;
            change = undefined;
            update();
        };
    }
    update();
};

setup();
/***************************************/
