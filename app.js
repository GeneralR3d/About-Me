const track = document.getElementById("image-track");

window.addEventListener("mousedown", function(e)
{
    document.querySelector("#song").play();
    track.dataset.mouseDownAt = e.clientX;
});

window.addEventListener("mousemove", function(e)
{
    if(track.dataset.mouseDownAt === "0") return;

    const mouseDelta = parseFloat(track.dataset.mouseDownAt) - e.clientX;
    const maxDelta = window.innerWidth / 2;
    
    const percentage = (mouseDelta/maxDelta) * -100;
    var nextPercentage = parseFloat(track.dataset.prevPercentage) + percentage;

    nextPercentage= Math.max(nextPercentage,-100);//sets range between -100 and 0
    nextPercentage = Math.min(nextPercentage,0);

    track.dataset.percentage = nextPercentage;

    track.animate({transform: `translate(${nextPercentage}%, -50%)`}, { duration: 1200, fill: "forwards"});

    for(const image of track.getElementsByClassName("image"))
    {
        image.animate({objectPosition: `${nextPercentage + 100}% 50%`}, { duration:1200, fill: "forwards"});
    }
    
});

window.addEventListener("mouseup", function()
{
    //document.querySelector("#song").pause();
    track.dataset.mouseDownAt = "0";
    track.dataset.prevPercentage = track.dataset.percentage;
});

window.addEventListener("touchstart", function(e)
{
    document.querySelector("#song").play();
    track.dataset.touchDownAt = e.touches[0].clientX;
});

window.addEventListener("touchmove", function(e)
{
    if(track.dataset.touchDownAt === "0") return;

    const touchDelta = parseFloat(track.dataset.touchDownAt) - e.touches[0].clientX;
    const maxDelta = window.innerWidth / 2;
    
    const percentage = (touchDelta/maxDelta) * -100;
    var nextPercentage = parseFloat(track.dataset.prevPercentage) + percentage;
    

    nextPercentage= Math.max(nextPercentage,-100);//sets range between -100 and 0
    nextPercentage = Math.min(nextPercentage,0);

    track.dataset.percentage = nextPercentage;

    track.animate({transform: `translate(${nextPercentage}%, -50%)`}, { duration: 1200, fill: "forwards"});

    for(const image of track.getElementsByClassName("image"))
    {
        image.animate({objectPosition: `${nextPercentage + 100}% 50%`}, { duration:1200, fill: "forwards"});
    }
    
});

window.addEventListener("touchend", function()
{
    //document.querySelector("#song").pause();
    track.dataset.touchDownAt = "0";
    track.dataset.prevPercentage = track.dataset.percentage;
});






