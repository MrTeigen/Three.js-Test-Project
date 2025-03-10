import * as THREE from 'three';

// Set up scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#F0F0F0');
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Load textures
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('2k_earth_daymap.jpg');
const dieTextures = [
    textureLoader.load('die_faces/die_face_1.png'),
    textureLoader.load('die_faces/die_face_2.png'),
    textureLoader.load('die_faces/die_face_3.png'),
    textureLoader.load('die_faces/die_face_4.png'),
    textureLoader.load('die_faces/die_face_5.png'),
    textureLoader.load('die_faces/die_face_6.png')
];

// Create Earth sphere
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

// Create die
const dieGeometry = new THREE.BoxGeometry(1, 1, 1);
const dieMaterials = dieTextures.map(texture => new THREE.MeshBasicMaterial({ map: texture }));
const die = new THREE.Mesh(dieGeometry, dieMaterials);
scene.add(die);
die.visible = false;

// Add light
const light = new THREE.DirectionalLight(0x9CDBA6, 10);
light.position.set(1, 1, 1);
scene.add(light);

// Initialize renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Variables for bouncing
let velocity = new THREE.Vector3(0.02, 0.02, 0);
let currentSize = 1;
let rotationSpeedX = 0.01;
let rotationSpeedY = 0.01;
let rotationSpeedZ = 0.01;
const sphereRadius = 1;
const dieSize = 0.5;
let stopping = false;
let storedVelocity = new THREE.Vector3();
let storedRotationSpeedX = 0;
let storedRotationSpeedY = 0;
let storedRotationSpeedZ = 0;
let isRotatingToTarget = false;
let targetQuaternion = new THREE.Quaternion();
const rotationSpeed = 0.05;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Calculate new screen boundaries in world coordinates
    const frustumSize = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = window.innerWidth / window.innerHeight;
    const screenWidth = frustumSize * aspect / 2;
    const screenHeight = frustumSize / 2;

    // Adjust sphere position if it goes outside the new boundaries
    if (sphere.position.x + sphereRadius * currentSize > screenWidth) {
        sphere.position.x = screenWidth - sphereRadius * currentSize;
    }
    if (sphere.position.x - sphereRadius * currentSize < -screenWidth) {
        sphere.position.x = -screenWidth + sphereRadius * currentSize;
    }
    if (sphere.position.y + sphereRadius * currentSize > screenHeight) {
        sphere.position.y = screenHeight - sphereRadius * currentSize;
    }
    if (sphere.position.y - sphereRadius * currentSize < -screenHeight) {
        sphere.position.y = -screenHeight + sphereRadius * currentSize;
    }

    // Adjust die position if it goes outside the new boundaries
    if (die.position.x + dieSize * currentSize > screenWidth) {
        die.position.x = screenWidth - dieSize * currentSize;
    }
    if (die.position.x - dieSize * currentSize < -screenWidth) {
        die.position.x = -screenWidth + dieSize * currentSize;
    }
    if (die.position.y + dieSize * currentSize > screenHeight) {
        die.position.y = screenHeight - dieSize * currentSize;
    }
    if (die.position.y - dieSize * currentSize < -screenHeight) {
        die.position.y = -screenHeight + dieSize * currentSize;
    }
});

// Toggle between sphere and die
document.querySelectorAll('input[name="object"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        if (event.target.value === 'earth') {
            sphere.visible = true;
            die.visible = false;
        } else {
            sphere.visible = false;
            die.visible = true;
        }
    });
});

const resetStopButton = () => {
    if (!stopping) return;
    stopping = false;
    document.getElementById('stopButton').textContent = 'Stop';
    document.getElementById('stopButton').style.backgroundColor = '#f00';
};

document.getElementById('velocityX').addEventListener('input', (event) => {
    velocity.x = parseFloat(event.target.value);
    resetStopButton();
});
document.getElementById('velocityY').addEventListener('input', (event) => {
    velocity.y = parseFloat(event.target.value);
    resetStopButton();
});
document.getElementById('size').addEventListener('input', (event) => {
    currentSize = parseFloat(event.target.value);
    sphere.scale.set(currentSize, currentSize, currentSize);
    die.scale.set(currentSize, currentSize, currentSize);
});
document.getElementById('rotationSpeedX').addEventListener('input', (event) => {
    rotationSpeedX = parseFloat(event.target.value);
    resetStopButton();
});
document.getElementById('rotationSpeedY').addEventListener('input', (event) => {
    rotationSpeedY = parseFloat(event.target.value);
    resetStopButton();
});
document.getElementById('rotationSpeedZ').addEventListener('input', (event) => {
    rotationSpeedZ = parseFloat(event.target.value);
    resetStopButton();
});

// Show/hide menu
document.getElementById('menuButton').addEventListener('click', () => {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

// Stop button
document.getElementById('stopButton').addEventListener('click', (event) => {
    if (stopping) {
        stopping = false;
        event.target.textContent = 'Stop';
        event.target.style.backgroundColor = '#f00';
        velocity.copy(storedVelocity);
        rotationSpeedX = storedRotationSpeedX;
        rotationSpeedY = storedRotationSpeedY;
        rotationSpeedZ = storedRotationSpeedZ;

        // Restore slider values
        document.getElementById('velocityX').value = velocity.x.toFixed(2);
        document.getElementById('velocityY').value = velocity.y.toFixed(2);
        document.getElementById('rotationSpeedX').value = rotationSpeedX.toFixed(2);
        document.getElementById('rotationSpeedY').value = rotationSpeedY.toFixed(2);
        document.getElementById('rotationSpeedZ').value = rotationSpeedZ.toFixed(2);
    } else {
        stopping = true;
        event.target.textContent = 'Resume';
        event.target.style.backgroundColor = '#0f0';
        storedVelocity.copy(velocity);
        storedRotationSpeedX = rotationSpeedX;
        storedRotationSpeedY = rotationSpeedY;
        storedRotationSpeedZ = rotationSpeedZ;
    }
});

// Function to calculate the closest 90-degree rotation
const getClosestRotation = (currentRotation) => {
    return Math.round(currentRotation / (Math.PI / 2)) * (Math.PI / 2);
};

// Function to set the target rotation for the die
const setTargetRotation = () => {
    const targetX = getClosestRotation(die.rotation.x);
    const targetY = getClosestRotation(die.rotation.y);
    const targetZ = getClosestRotation(die.rotation.z);

    // Create a target quaternion from the target Euler angles
    const targetEuler = new THREE.Euler(targetX, targetY, targetZ, 'XYZ');
    targetQuaternion.setFromEuler(targetEuler);

    isRotatingToTarget = true;
};

const animate = () => {
    requestAnimationFrame(animate);

    // Update position
    if (sphere.visible) {
        sphere.position.add(velocity);
    } else {
        die.position.add(velocity);
    }

    // Calculate screen boundaries in world coordinates
    const frustumSize = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = window.innerWidth / window.innerHeight;
    const screenWidth = frustumSize * aspect / 2;
    const screenHeight = frustumSize / 2;

    // Check for collisions with screen edges and reverse velocity if needed
    if (sphere.visible) {
        if (sphere.position.x + sphereRadius * currentSize > screenWidth) {
            sphere.position.x = screenWidth - sphereRadius * currentSize;
            velocity.x = -velocity.x;
        }
        if (sphere.position.x - sphereRadius * currentSize < -screenWidth) {
            sphere.position.x = -screenWidth + sphereRadius * currentSize;
            velocity.x = -velocity.x;
        }
        if (sphere.position.y + sphereRadius * currentSize > screenHeight) {
            sphere.position.y = screenHeight - sphereRadius * currentSize;
            velocity.y = -velocity.y;
        }
        if (sphere.position.y - sphereRadius * currentSize < -screenHeight) {
            sphere.position.y = -screenHeight + sphereRadius * currentSize;
            velocity.y = -velocity.y;
        }

        sphere.rotation.x += rotationSpeedX;
        sphere.rotation.y += rotationSpeedY;
        sphere.rotation.z += rotationSpeedZ;
    } else {
        if (die.position.x + dieSize * currentSize > screenWidth) {
            die.position.x = screenWidth - dieSize * currentSize;
            velocity.x = -velocity.x;
        }
        if (die.position.x - dieSize * currentSize < -screenWidth) {
            die.position.x = -screenWidth + dieSize * currentSize;
            velocity.x = -velocity.x;
        }
        if (die.position.y + dieSize * currentSize > screenHeight) {
            die.position.y = screenHeight - dieSize * currentSize;
            velocity.y = -velocity.y;
        }
        if (die.position.y - dieSize * currentSize < -screenHeight) {
            die.position.y = -screenHeight + dieSize * currentSize;
            velocity.y = -velocity.y;
        }

        die.rotation.x += rotationSpeedX;
        die.rotation.y += rotationSpeedY;
        die.rotation.z += rotationSpeedZ;
    }

    // Create a quaternion for the needed rotation
    if (!sphere.visible && isRotatingToTarget) {
        const currentQuaternion = new THREE.Quaternion().setFromEuler(die.rotation);
        currentQuaternion.slerp(targetQuaternion, rotationSpeed);
        die.quaternion.copy(currentQuaternion);

        if (currentQuaternion.angleTo(targetQuaternion) < 0.01) {
            die.rotation.setFromQuaternion(targetQuaternion); // Snap to the exact target
            isRotatingToTarget = false; // Stop rotating
        }
    }

    // Gradually decrease velocity and rotation speed when stopping
    if (stopping) {
        velocity.multiplyScalar(0.99);
        rotationSpeedX *= 0.99;
        rotationSpeedY *= 0.99;
        rotationSpeedZ *= 0.99;

        // Slow die rotation so it can get to nearest 90 degrees when stopped
        if (velocity.length() < 0.001 && rotationSpeedX < 0.001 && rotationSpeedY < 0.001 && rotationSpeedZ < 0.001) {
            velocity.set(0, 0, 0);
            rotationSpeedX = 0;
            rotationSpeedY = 0;
            rotationSpeedZ = 0;
            
            if (!sphere.visible) {
                setTargetRotation();
            }
        }
    }

    // Update sliders to reflect current values
    document.getElementById('velocityX').value = Math.abs(velocity.x.toFixed(2));
    document.getElementById('velocityY').value = Math.abs(velocity.y.toFixed(2));
    document.getElementById('rotationSpeedX').value = Math.abs(rotationSpeedX.toFixed(2));
    document.getElementById('rotationSpeedY').value = Math.abs(rotationSpeedY.toFixed(2));
    document.getElementById('rotationSpeedZ').value = Math.abs(rotationSpeedZ.toFixed(2));

    renderer.render(scene, camera);
};

animate();
