const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Lấy các phần tử UI
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const changeCharButton = document.getElementById('changeCharButton');
const charFileInput = document.getElementById('charFileInput');
const charPreview = document.getElementById('charPreview');
const charOptionsPopup = document.getElementById('charOptionsPopup');
const defaultCharButton = document.getElementById('defaultCharButton');
const uploadCharButton = document.getElementById('uploadCharButton');
const cancelCharButton = document.getElementById('cancelCharButton');

// Đường dẫn tài nguyên
const birdImgSrc = 'assets/virus.png';
const pipeImgSrcs = ['assets/ong.png', 'assets/ong2.png', 'assets/ong3.png'];

// Tải hình ảnh
let birdImg = new Image();
let pipeImgs = [];
let imagesLoaded = 0;
let totalImages = 1 + pipeImgSrcs.length;

function imageLoaded() {
    imagesLoaded++;
    // Cập nhật ảnh xem trước khi ảnh mặc định tải xong (nếu là ảnh chim)
    if (this === birdImg && charPreview) {
        charPreview.src = this.src;
    }
    if (imagesLoaded === totalImages) {
        console.log("Tất cả hình ảnh đã được tải.");
        // Đảm bảo ảnh xem trước hiển thị ảnh mặc định khi tất cả tải xong
        if (charPreview) charPreview.src = birdImg.src;
    }
}

birdImg.onload = imageLoaded;
birdImg.src = birdImgSrc;

pipeImgSrcs.forEach(src => {
    let img = new Image();
    img.onload = imageLoaded;
    img.src = src;
    pipeImgs.push(img);
});


// Cài đặt game
let bird = {
    x: 50,
    y: 150,
    width: 40,  // Điều chỉnh kích thước nếu cần
    height: 40, // Điều chỉnh kích thước nếu cần
    gravity: 0.4, // Giảm trọng lực để dễ hơn
    lift: -7, // Giảm lực nâng để dễ hơn
    velocity: 0
};

let pipes = [];
let pipeWidth = 80; // Độ rộng ống
let pipeGap = 350; // Khoảng cách giữa ống trên và dưới
let pipeDistance = 400; // Khoảng cách giữa các cặp ống
let pipeSpeed = 7; // Tốc độ di chuyển ống

// Thêm các biến đệm va chạm ở đây
let birdCollisionPaddingX = 50; // Số pixel bỏ qua ở bên trái/phải khi kiểm tra va chạm
let birdCollisionPaddingY = 50;  // Số pixel bỏ qua ở trên/dưới khi kiểm tra va chạm

let score = 0;
let gameInterval;
let animationFrameId;
let gameStarted = false;
let gameOver = false;

// Hàm tiện ích
function getRandomPipeImage() {
    const randomIndex = Math.floor(Math.random() * pipeImgs.length);
    return pipeImgs[randomIndex];
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Vẽ
function drawBird() {
    if (birdImg.complete) { // Chỉ vẽ nếu ảnh đã tải xong
        ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    } else {
        // Vẽ hình chữ nhật thay thế nếu ảnh chưa tải
        ctx.fillStyle = 'red';
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    }
}

function drawPipes() {
    const pipeBodyColor = '#2E8B57'; // Màu xanh lá cây cho thân ống (SeaGreen)
    const outlineColor = '#000';    // Màu viền
    const outlineWidth = 2;         // Độ dày viền
    const inset = 3;                // Khoảng cách thụt vào của ảnh bên trong so với viền

    pipes.forEach(pipe => {
        let topPipeHeight = pipe.topHeight;
        let bottomPipeY = topPipeHeight + pipeGap;
        let bottomPipeHeight = canvas.height - bottomPipeY;

        // --- Vẽ Ống Trên ---

        // 1. Vẽ Thân Ống Trên (Màu nền)
        ctx.fillStyle = pipeBodyColor;
        ctx.fillRect(pipe.x, 0, pipeWidth, topPipeHeight);

        // 2. Vẽ Ảnh Ngẫu Nhiên Bên Trong Ống Trên (Lát gạch & thụt vào)
        let imgTop = pipe.imgTop;
        if (imgTop && imgTop.complete && pipeWidth > 2 * inset && topPipeHeight > 2 * inset) {
            ctx.save(); // Lưu trạng thái canvas (để áp dụng clip)

            // Tạo vùng cắt (clip) hơi thụt vào bên trong thân ống
            ctx.beginPath();
            ctx.rect(pipe.x + inset, inset, pipeWidth - 2 * inset, topPipeHeight - 2 * inset);
            ctx.clip(); // Chỉ vẽ bên trong vùng rect này

            // Logic lát gạch ảnh (vẽ bên trong vùng đã clip)
            let imgRatio = imgTop.height / imgTop.width;
            // Điều chỉnh drawWidth/Height dựa trên vùng clip
            let drawWidth = pipeWidth - 2 * inset;
            let drawHeight = drawWidth * imgRatio;
            // Nếu drawHeight quá nhỏ (ảnh quá rộng), thì tính drawWidth từ drawHeight cố định
            if (drawHeight < 10) { // Ngưỡng chiều cao tối thiểu để tránh lỗi
                drawHeight = Math.max(10, imgTop.height * 0.5); // Chiều cao vẽ tối thiểu hoặc 50% chiều cao gốc
                drawWidth = drawHeight / imgRatio;
            }
            let numRepeatsY = Math.ceil((topPipeHeight - 2 * inset) / drawHeight);
            let numRepeatsX = Math.ceil((pipeWidth - 2 * inset) / drawWidth); // Lặp cả chiều ngang nếu cần

            for (let y = 0; y < numRepeatsY; y++) {
                for (let x = 0; x < numRepeatsX; x++) {
                    ctx.drawImage(imgTop,
                        pipe.x + inset + x * drawWidth, // Vị trí x có tính lặp
                        inset + y * drawHeight,         // Vị trí y có tính lặp
                        drawWidth, drawHeight);
                }
            }
            ctx.restore(); // Hủy bỏ vùng cắt (clip)
        }

        // 3. Vẽ Viền Ống Trên (Vẽ đè lên trên cùng)
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.strokeRect(pipe.x, 0, pipeWidth, topPipeHeight);


        // --- Vẽ Ống Dưới --- (Tương tự ống trên)

        // 1. Vẽ Thân Ống Dưới (Màu nền)
        ctx.fillStyle = pipeBodyColor;
        ctx.fillRect(pipe.x, bottomPipeY, pipeWidth, bottomPipeHeight);

        // 2. Vẽ Ảnh Ngẫu Nhiên Bên Trong Ống Dưới (Lát gạch & thụt vào)
        let imgBottom = pipe.imgBottom;
        if (imgBottom && imgBottom.complete && pipeWidth > 2*inset && bottomPipeHeight > 2*inset) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(pipe.x + inset, bottomPipeY + inset, pipeWidth - 2 * inset, bottomPipeHeight - 2 * inset);
            ctx.clip();

            let imgRatio = imgBottom.height / imgBottom.width;
            let drawWidth = pipeWidth - 2 * inset;
            let drawHeight = drawWidth * imgRatio;
            if (drawHeight < 10) {
                 drawHeight = Math.max(10, imgBottom.height * 0.5);
                 drawWidth = drawHeight / imgRatio;
            }
            let numRepeatsY = Math.ceil((bottomPipeHeight - 2 * inset) / drawHeight);
            let numRepeatsX = Math.ceil((pipeWidth - 2 * inset) / drawWidth);


            for (let y = 0; y < numRepeatsY; y++) {
                 for (let x = 0; x < numRepeatsX; x++) {
                    ctx.drawImage(imgBottom,
                        pipe.x + inset + x * drawWidth,
                        bottomPipeY + inset + y * drawHeight,
                        drawWidth, drawHeight);
                 }
            }
            ctx.restore();
        }

        // 3. Vẽ Viền Ống Dưới
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.strokeRect(pipe.x, bottomPipeY, pipeWidth, bottomPipeHeight);
    });
}

// Cập nhật trạng thái game
function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Ngăn chim bay quá cao
    if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
    }
    // Kiểm tra va chạm với mặt đất
    if (bird.y + bird.height > canvas.height) {
        triggerGameOver();
    }
}

function updatePipes() {
    // Thêm ống mới nếu cần (luôn thực hiện)
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - pipeDistance) {
        let topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50; // Chiều cao ngẫu nhiên, cách lề 50px
        pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            passed: false,
            imgTop: getRandomPipeImage(), // Gán ảnh ngẫu nhiên
            imgBottom: getRandomPipeImage() // Gán ảnh ngẫu nhiên
        });
    }

    // Di chuyển ống (luôn thực hiện)
    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        // Chỉ kiểm tra tính điểm và va chạm nếu game đang chạy
        if (gameStarted && !gameOver) {
            // Kiểm tra tính điểm
            if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                score++;
                scoreElement.textContent = score;
                pipe.passed = true;
            }

            // Kiểm tra va chạm với vùng hiệu quả (có đệm)
            let effectiveBirdX = bird.x + birdCollisionPaddingX;
            let effectiveBirdWidth = bird.width - 2 * birdCollisionPaddingX;
            let effectiveBirdY = bird.y + birdCollisionPaddingY;
            let effectiveBirdHeight = bird.height - 2 * birdCollisionPaddingY;

            // Đảm bảo width/height hiệu quả không âm nếu padding quá lớn
            if (effectiveBirdWidth < 0) effectiveBirdWidth = 0;
            if (effectiveBirdHeight < 0) effectiveBirdHeight = 0;

            if (
                effectiveBirdX < pipe.x + pipeWidth &&
                effectiveBirdX + effectiveBirdWidth > pipe.x &&
                (effectiveBirdY < pipe.topHeight || effectiveBirdY + effectiveBirdHeight > pipe.topHeight + pipeGap)
            ) {
                triggerGameOver();
            }
        } // Kết thúc khối if (gameStarted && !gameOver)
    });

    // Xóa ống đã ra khỏi màn hình (luôn thực hiện)
    pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

// Vòng lặp game
function gameLoop() {
    // 1. Xóa màn hình
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Cập nhật trạng thái
    // Chỉ cập nhật chim nếu game đang chạy và chưa kết thúc
    if (gameStarted && !gameOver) {
        updateBird();
    }
    // Chỉ cập nhật ống nếu game chưa kết thúc (cho phép chạy ở màn hình chờ)
    if (!gameOver) {
        updatePipes();
    }

    // 3. Vẽ lại
    // Luôn vẽ ống (để chúng hiển thị cả khi game over)
    drawPipes();

    // Vẽ chim nếu game đang chạy HOẶC game đã kết thúc
    if ((gameStarted && !gameOver) || gameOver) {
        drawBird();
    }

    // Lặp lại - yêu cầu frame tiếp theo
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Điều khiển
function birdFlap() {
    if (!gameOver && gameStarted) {
        bird.velocity = bird.lift;
    }
}

// Bắt đầu và kết thúc game
function startGame() {
    if (imagesLoaded < totalImages) {
        alert("Hình ảnh đang tải, vui lòng đợi!");
        return;
    }
    resizeCanvas(); // Đảm bảo kích thước canvas đúng trước khi bắt đầu
    bird = { // Reset vị trí và tốc độ chim
        x: 50,
        y: 150,
        width: 140, // Đặt chiều rộng mong muốn
        height: 140, // Đặt chiều cao mong muốn
        gravity: 0.8,
        lift: -10,
        velocity: 0
    };
    pipes = []; // Xóa ống cũ khi bắt đầu game mới
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;       // Đặt lại trạng thái game over
    gameStarted = true;     // Đánh dấu game đã bắt đầu

    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    scoreDisplay.style.display = 'block';

    // Không cần gọi gameLoop hay cancelAnimationFrame ở đây nữa
    // vì vòng lặp đã chạy liên tục từ đầu.
}

function triggerGameOver() {
    if (gameOver) return; // Chỉ trigger một lần
    gameOver = true;        // Đánh dấu game đã kết thúc
    gameStarted = false;    // Đánh dấu game không còn chạy nữa

    // Cập nhật điểm vào span có id="finalScore"
    finalScoreElement.textContent = score;

    // Hiển thị màn hình Game Over mới và ẩn điểm số đang chạy
    gameOverScreen.style.display = 'block';
    scoreDisplay.style.display = 'none';

    // Không cần dừng animation frame nữa vì gameLoop đã xử lý
}

// Fullscreen
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(resizeCanvas) // Resize canvas sau khi vào fullscreen
            .catch(err => {
                alert(`Lỗi khi bật fullscreen: ${err.message} (${err.name})`);
            });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen()
                .then(resizeCanvas); // Resize lại khi thoát
        }
    }
}

// Lắng nghe sự kiện
window.addEventListener('resize', () => {
     if(gameStarted && !gameOver){
        resizeCanvas();
        // Có thể cần điều chỉnh lại vị trí các đối tượng nếu muốn game tiếp tục mượt mà
        // Hoặc đơn giản là báo người dùng resize sẽ reset game
     } else if (!gameStarted) {
         resizeCanvas(); // Cho phép resize màn hình chờ
     }
});
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        birdFlap();
    }
});
canvas.addEventListener('mousedown', birdFlap); // Click chuột để bay
canvas.addEventListener('touchstart', birdFlap); // Chạm màn hình để bay (mobile)

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
fullscreenButton.addEventListener('click', toggleFullScreen);

// Thêm sự kiện cho nút "Đổi nhân vật" (thay vì nút cũ)
changeCharButton.addEventListener('click', () => {
    charOptionsPopup.style.display = 'block'; // Hiện popup lựa chọn
});

// Sự kiện cho nút "Dùng ảnh mặc định" trong popup
defaultCharButton.addEventListener('click', () => {
    birdImg.src = birdImgSrc; // Đặt lại nguồn ảnh
    if (charPreview) {
        charPreview.src = birdImgSrc; // Cập nhật ảnh xem trước
    }
    console.log("Đã chọn ảnh mặc định.");
    charOptionsPopup.style.display = 'none'; // Ẩn popup
});

// Sự kiện cho nút "Tải ảnh lên" trong popup
uploadCharButton.addEventListener('click', () => {
    charFileInput.click(); // Mở hộp thoại chọn tệp
    charOptionsPopup.style.display = 'none'; // Ẩn popup sau khi mở hộp thoại
});

// Sự kiện cho nút "Hủy" trong popup
cancelCharButton.addEventListener('click', () => {
    charOptionsPopup.style.display = 'none'; // Chỉ cần ẩn popup
});

// Sự kiện khi người dùng chọn tệp ảnh (input file) - giữ nguyên logic cập nhật ảnh
charFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newImgSrc = e.target.result;
            birdImg.src = newImgSrc;
            if (charPreview) {
                charPreview.src = newImgSrc;
            }
            console.log("Nhân vật đã được cập nhật từ tệp.");
        }
        reader.onerror = (e) => {
            console.error("Lỗi khi đọc tệp:", e);
            alert("Không thể tải ảnh nhân vật.");
        }
        reader.readAsDataURL(file);
    } else if (file) {
        alert("Vui lòng chọn một tệp hình ảnh hợp lệ.");
    }
    event.target.value = null;
});

// Khởi tạo ban đầu
resizeCanvas(); // Đặt kích thước canvas ban đầu

// Hiển thị màn hình bắt đầu và ẩn popup
startScreen.style.display = 'block';
charOptionsPopup.style.display = 'none'; // Đảm bảo popup ẩn khi tải

// Bắt đầu vòng lặp game ngay lập tức khi tải trang
gameLoop(); 