const statusElement = document.getElementById("status");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");

function updateUi(isRecording){
    statusElement.textContent = isRecording ? "Recording captions" : "Not recording";
    statusElement.classList.toggle("recording", isRecording);
    
    startButton.disabled = isRecording;
    stopButton.disabled = !isRecording;
}

async function loadRecordingStatus()
{
    const response = await chrome.runtime.sendMessage({
        type: "GET_RECORDING_STATUS"
    });

    updateUi(response?.isRecording ?? false);
}


startButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
        type: "START_RECORDING"
    });

    updateUi(response?.isRecording ?? false);

    if (response?.error) {
        statusElement.textContent = response.error;
    }
})

stopButton.addEventListener("click", async() => {
    const response = await chrome.runtime.sendMessage({
        type: "STOP_RECORDING"
    });

    updateUi(response?.isRecording ?? false);

    if (response?.error) {
        statusElement.textContent = response.error;
    }
})


loadRecordingStatus();
