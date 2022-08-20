let video = document.querySelector(".video");
const canvas = document.getElementById("canv");
const ctx = canvas.getContext("2d");
let slider = document.getElementById('slider');

let video_size = {'w': 0, 'h': 0};
let filename = 'in.mp4';
let time_start = 0;
let time_end = 1;
let crop = [null, null];
let selected_file = null;

$(() => {
    $("#video_selector").change(function (e) {
        let fileInput = e.target;
        let fileUrl = window.URL.createObjectURL(fileInput.files[0]);
        filename = fileInput.files[0].name;
        selected_file = fileInput.files[0];
        $(".video").attr("src", fileUrl);
        e.target.remove();
        document.getElementById("upload").remove();
    });

    $("#mute_toggle").click(function () {
        $(video).prop('muted', !$(video).prop('muted'));
    });

    $(".video").bind("loadedmetadata", function (e) {
        video_size = {'w': this.videoWidth, 'h': this.videoHeight};
        $('.hide_until_load').removeClass('hidden');
        noUiSlider.create(slider, {
            start: [0, this.duration],
            connect: true,
            range: {
                'min': 0,
                'max': this.duration
            }
        });
        document.getElementsByClassName("slider_control")[1].value = this.duration
        slider.noUiSlider.on('update', (range) => {
            update_slider_fields(range);
        });
        update_slider_fields();
    }).bind('loadeddata', function (e) {
        // noinspection JSIgnoredPromiseFromCall
        e.target.play();  // start playing
    }).on('pause', (e) => {
        console.log('Paused: ', e.target.currentTime)
    });

    $('.slider_control').on('change', (e) => {
        set_slider();
    });

    let drawing = false;
    $("#canv").mousedown((e) => {
        let pos = getMousePos(canvas, e);
        drawing = true;
        console.log('click', pos);
        crop = [pos, null]
    }).mousemove(function (e) {
        if (!drawing)
            return;
        let pos = getMousePos(canvas, e);
        crop = [crop[0], pos];
    }).on('mouseup', function (e) {
        if (!drawing)
            return;
        let pos = getMousePos(canvas, e);
        console.log('Mouse Up', pos);
        crop = [crop[0], pos];
        drawing = false;
        if (crop[0].x === crop[1].x && crop[0].y === crop[1].y)
            crop = [null, null];
        console.log(crop);
    });

    $('.slider_time_pos').mousedown((e) => {
        let ele = e.target;
        let last_pos = e.clientX;

        function mup() {
            console.log('up');
            document.onmousemove = null;
            document.onmouseup = null;
        }

        function mmov(e, ele) {
            let delta = e.clientX - last_pos;
            console.log('Delta:', delta);
            last_pos = e.clientX;
            let total_percent = (ele.offsetLeft + delta) / ele.parentElement.offsetWidth;
            console.log(total_percent);
            video.currentTime = video.duration * total_percent
        }

        document.onmousemove = (e) => {
            mmov(e, ele)
        };
        document.onmouseup = (e) => {
            mup()
        };
    });
});

function upload() {
    let fileUrl = document.getElementById("video_url").value;
    filename = fileUrl.split("/").pop()
    $(".video").attr("src", fileUrl);
    document.getElementById("upload").remove();
}

function update_slider_fields(range) {
    if (!range || range.length < 2)
        return;
    document.querySelectorAll('.slider_control').forEach(function (input) {
        // noinspection JSUndefinedPropertyAssignment
        // input.value = range[input.dataset.pos];
    });
    time_start = parseFloat(range[0]);
    time_end = parseFloat(range[1]);
}


function set_slider() {
    let vals = [];
    document.querySelectorAll('.slider_control').forEach(function (input) {
        vals.push(input.value)
    });
    console.log(vals);
    slider.noUiSlider.set(vals);
}


function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / rect.width,
        y: (evt.clientY - rect.top) / rect.height
    };
}

function unscale(coords, rect) {
    return {
        'x': coords.x * rect.width,
        'y': coords.y * rect.height
    }
}

function crop_box(crop, in_width, in_height) {
    let rect = {'width': in_width, 'height': in_height};
    let p1 = unscale(crop[0], rect), p2 = unscale(crop[1], rect);
    let x = Math.min(p1.x, p2.x);
    let y = Math.min(p1.y, p2.y);
    let w = Math.abs(p1.x - p2.x);
    let h = Math.abs(p1.y - p2.y);
    return {
        'x': Math.floor(x),
        'y': Math.floor(y),
        'w': Math.floor(w),
        'h': Math.floor(h)
    }
}

function pause_toggle() {
    console.log('toggle play');
    if (video.paused) {
        video.play().finally(() => {
            $(".play_toggle").html('&#10074;&#10074;')
        });
    } else {
        video.pause();
        $(".play_toggle").html('&#9654;')
    }
}

function set_current_start_time() {
    let current_time = video.currentTime.toFixed(2);
    document.getElementById("start_time").value = current_time;
    time_start = parseFloat(current_time);

    set_ffmpeg_text()
    let vals = [];
    vals[0] = time_start;
    vals[1] = time_end;
    slider.noUiSlider.set(vals);
}

function set_current_end_time() {
    let current_time = video.currentTime.toFixed(2);
    document.getElementById("end_time").value = current_time;
    time_end = parseFloat(current_time);

    set_ffmpeg_text()
    let vals = [];
    vals[0] = time_start;
    vals[1] = time_end;
    slider.noUiSlider.set(vals);
}

function rewind() {
    let time = video.currentTime.toFixed(2) - document.getElementById("time_number").value;
    if (time >= 0) {
        video.currentTime = time
    } else {
        video.currentTime = 0
    }
    let range = slider.noUiSlider.get();
    if (time < range[0]) {
        range[0] = time;
        slider.noUiSlider.set(range);
    }
}

function fast_forward() {
    let time = Number(video.currentTime.toFixed(2)) + Number(document.getElementById("time_number").value);
    if (time <= video.duration) {
        video.currentTime = time;
    } else {
        video.currentTime = video.duration;
    }
    let range = slider.noUiSlider.get();
    if (range[1] < time) {
        range[1] = time;
        slider.noUiSlider.set(range);
    }
}

async function copyText() {
    await navigator.permissions.query({name: "clipboard-write"});

    await navigator.clipboard.writeText($('.ffmpeg').text()).then(() => {
        console.log('Copied to clipboard.');
    }).catch(console.error)
}

function build_ffmpeg_string(for_browser_run = false) {
    let ts = (time_start ? time_start.toFixed(2) : 0);
    let te = (time_end ? time_end.toFixed(2) : 0);
    let args = [
        '-i', `${for_browser_run ? filename : '"' + filename + '"'}`,
        '-movflags', 'faststart',
        '-t', (te - ts).toFixed(4)
    ];
    if (ts) {
        args.unshift('-ss', ts);
    }
    if (crop[0] && crop[1]) {
        let box = crop_box(crop, video_size.w, video_size.h);
        let crp = `"crop=${box.w}:${box.h}:${box.x}:${box.y}"`;
        if (for_browser_run) crp = crp.replace(/"/g, '');
        args.push('-filter:v', crp);
    }
    let from_time = secondToDate(ts) + "-" + secondToDate(te) + "-" + filename;
    let fn = for_browser_run ? 'output.mp4' : from_time;
    args.push('-c:a', 'copy');
    args.push(fn);
    return for_browser_run ? args : args.join(' ');
}

function secondToDates(result) {
    return secondToDate(result) + "." + result.split(".").pop();
}

function secondToDate(result) {
    const h = Math.floor(result / 3600).toString().padStart(2, "0");
    const m = Math.floor((result / 60 % 60)).toString().padStart(2, "0");
    const s = Math.floor((result % 60)).toString().padStart(2, "0");
    return h + ":" + m + ":" + s;
}

function update() {
    canvas.width = $(video).width();
    canvas.height = $(video).height();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (video.currentTime < time_start)
        video.currentTime = time_start;
    if (video.currentTime > time_end)
        video.currentTime = time_start;
    let complete_percent = 100 * (video.currentTime / video.duration);
    $(".slider_time_pos").css("left", complete_percent + "%");
    $(".current_time").text(video.currentTime.toFixed(2));
    $(".current_time_form").text(secondToDates(document.getElementById("current_time").innerText));
    // noinspection JSCheckFunctionSignatures
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); //TODO: Subimage using crop.

    if (crop[0] && crop[1]) {
        let rect = canvas.getBoundingClientRect();
        let box = crop_box(crop, rect.width, rect.height);
        ctx.strokeStyle = "#FF0000";
        ctx.strokeRect(box.x, box.y, box.w, box.h);
    }

    set_ffmpeg_text()
    requestAnimationFrame(update.bind(this)); // Tell browser to trigger this method again, next animation frame.
}

function set_ffmpeg_text() {
    let mpeg = 'ffmpeg -hwaccel_output_format qsv ' + build_ffmpeg_string(false);
    if ($('.ffmpeg').text() !== mpeg) {
        $('.ffmpeg').text(mpeg);
    }
}

update(); //Start rendering
