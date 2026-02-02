// ==UserScript==
// @name         reduce google photos to img
// @namespace    https://github.com/octo-badger/
// @version      2026-02-02
// @description  google photos image reference viewer with pinch-zoom and grid overlay (generated from imgRef.htm using build script)
// @author       Richard Lidstone
// @run-at       context-menu
// @match        https://photos.google.com/*
// @grant        none
// ==/UserScript==

(function() 
{
    'use strict';

    const styl = `<style>

            body 
            {
                touch-action: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin: 0px;
                overflow: hidden;
                height: 100vh;
                width: 100vw;
                font-family: Verdana, Geneva, Tahoma, sans-serif;
            }

            #uiOverlay
            {
                align-self: end;
                z-index: 1;
            }

            #uiOverlay svg
            {
                width: 30px;
                height: 30px;
                border: 3px solid rgb(206, 194, 194);
                border-radius: 5px;
                padding: 3px;
                margin: 4px 2px;
                color: rgb(0, 225, 225);
                display: block;
            }

            #uiOverlay svg:hover { color: blueviolet; }
            #uiOverlay svg:active { color: black; }
            #uiOverlay svg.selected { color: rgb(255, 183, 0); }
            #uiOverlay svg.disabled { color: #ddd; }

            #uiOverlay div.break
            {
                border: 2px solid rgb(206, 194, 194);
                border-radius: 2px;
                margin: 10px;
            }
            
        
            img#reference
            {
                position: absolute;
                height: 100vh;
                z-index: -1;
            }

            canvas#grid
            {
                position: absolute;
            }

            .hidden
            {
                display: none !important;
            }

            .flipped
            {
                transform: scaleX(-1);
            }

            div 
            {            
                position: relative;
                margin-top: 2px;
            }

            div[title]:hover::after 
            {
                background-color: rgb(255, 183, 0);
                padding: 7px 15px;
                border-radius: 10px;
                content: attr(title);
                position: absolute;
                top: 15%;
                left: -450%;
                white-space: nowrap;
                opacity: 80%;
            }

        </style>`;

    window.trustedTypes.createPolicy('default', {                                   // set up trusted types policy to avoid csp issues that prevent us from hijacking the page
        createHTML: string => string,
        createScriptURL: string => string,
        createScript: string => string,
    });

    navigator.serviceWorker.getRegistration()                                       // trying to remove the service worker that google photos installs - there's some process that's buggering about in the background
            .then(registration => 
            {
                if(registration) 
                {
                    registration.unregister()
                        .then(success => success ?
                                            console.log('Service Worker unregistered successfully.') :
                                                console.log('Service Worker unregistration failed.')
                        )
                        .catch(error => console.error('Error during Service Worker unregistration:', error));
                } 
                else
                    console.log('No Service Worker registration found.');
            })
            .catch(error => console.warn('Error getting Service Worker registration:', error));


    // function to remove all content and attributes from an element before returning it clean
    const clearElement = (elementId, content = '') =>
    {
        const element = document.querySelector(elementId);

        if (element)
        {
            element.innerHTML = content;                                                                    // set inner HTML (possibly to nothing)
            [...element.attributes].forEach(attr => element.removeAttribute(attr.name));                    // Remove all attributes
        } else {
            console.warn(`El '${elementId}' not found.`);
        }

        return element;
    }


    const img = [...document.querySelectorAll('img')]                                               // grab all the images on the page
                        .filter(i => /^https/.test(i.src))                                          // filter out non-https images (they're not the main image)
                        .filter(i => {
                                        const s = window.getComputedStyle(i);                           // get computed style
                                        return s.visibility != 'hidden' && s.display != 'none';         // filter out hidden images
                                    })[0];                                                                  // take the first one - should be the main image                               

    const head = clearElement('head');                                                              // remove all content from the head element
    const body = clearElement('body', `<div id="uiOverlay"> 
            <div title="pinch-zoom image"><svg id="image" class="selected" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z"></path></svg></div>
            <div title="pinch-zoom grid"><svg id="grid" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H10V14H14V10ZM16 10V14H19V10H16ZM14 19V16H10V19H14ZM16 19H19V16H16V19ZM14 5H10V8H14V5ZM16 5V8H19V5H16ZM8 10H5V14H8V10ZM8 19V16H5V19H8ZM8 5H5V8H8V5ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z"></path></svg></div>
            <div title="flip horizontal">
                <svg id="flip" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2V22H13V2H11ZM2 6C2 4.89543 2.89543 4 4 4H7C8.10457 4 9 4.89543 9 6V18C9 19.1046 8.10457 20 7 20H4C2.89543 20 2 19.1046 2 18V6ZM20 6V18H17V6H20ZM17 4C15.8954 4 15 4.89543 15 6V18C15 19.1046 15.8954 20 17 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H17Z"></path></svg>
                <svg id="flop" class="hidden" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2V22H13V2H11ZM7 6V18H4L4 6H7ZM4 4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H7C8.10457 20 9 19.1046 9 18V6C9 4.89543 8.10457 4 7 4H4ZM15 6C15 4.89543 15.8954 4 17 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H17C15.8954 20 15 19.1046 15 18V6Z"></path></svg>
            </div>
            <div class="break"></div>
            <div title="browse files"><svg id="browseFile" viewBox="0 0 24 24" fill="currentColor"><path d="M15 8V4H5V20H19V8H15ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM11 9.5C11 10.3284 10.3284 11 9.5 11C8.67157 11 8 10.3284 8 9.5C8 8.67157 8.67157 8 9.5 8C10.3284 8 11 8.67157 11 9.5ZM17.5 17L13.5 10L8 17H17.5Z"></path></svg></div>
            <div class="break"></div>
            <div title="lock pinch-zoom"><svg id="unlocked" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10H20C20.5523 10 21 10.4477 21 11V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V11C3 10.4477 3.44772 10 4 10H5V9C5 5.13401 8.13401 2 12 2C14.7405 2 17.1131 3.5748 18.2624 5.86882L16.4731 6.76344C15.6522 5.12486 13.9575 4 12 4C9.23858 4 7 6.23858 7 9V10ZM10 15V17H14V15H10Z"></path></svg></div>
            <div title="unlock pinch-zoom"><svg id="locked" class="hidden" viewBox="0 0 24 24" fill="currentColor"><path d="M19 10H20C20.5523 10 21 10.4477 21 11V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V11C3 10.4477 3.44772 10 4 10H5V9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9V10ZM17 10V9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9V10H17ZM11 14V18H13V14H11Z"></path></svg></div>
        </div>
        <canvas id="grid"></canvas>`);                                                    // remove all content from the body element and set UI content

    [...img.attributes].filter(attr => attr.name != 'src')                                          // grab all attributes of the image except the src ...
                       .forEach(attr => img.removeAttribute(attr.name));                            // ... and remove them

    img.id = 'reference';
    body.appendChild(img);

    head.innerHTML = styl;

    const canvas = document.querySelector('canvas#grid');
        const maxDimension = Math.max(body.clientWidth, body.clientHeight) * 3;
        canvas.width = maxDimension;
        canvas.height = maxDimension;
        const context = canvas.getContext("2d");
        const eventCache = new Map();

        let pinch = {};
        let pinchTarget = img;
        
        const state = {
            img: {
                height: img.style.height,
                left: img.style.left,
                top: img.style.top,
            },
            canvas: {
                height: canvas.style.height,
                left: canvas.style.left,
                top: canvas.style.top,
            }
        };
        
        
        function pointerdownHandler(e)
        {
            e.preventDefault();
            let id = e.pointerId;

            eventCache.set(id, e);
            checkPinch();

            console.debug(`down id:${id}: `, e);
        }


        function pointerupHandler(e)
        {
            e.preventDefault();
            let id = e.pointerId;

            if(eventCache.delete(id))                           // will be false if the key didn't exist (not sure how that would happen, but moz always check in the examples)
            {
                checkPinch();
                console.debug(`up id:${id}: `, e);
            }
        }

        function checkPinch()
        {
            console.log('checkPinch');
            pinch = null;                                                               // we always want to reset when pointer events are added or deleted 
            if(eventCache.size === 2)                                                   // if we have exactly 2 pointer events...
            {
                /*
                const [key1, key2] = Array.from(eventCache.keys());                         // get both keys
                const [e1, e2] = [eventCache.get(key1), eventCache.get(key2)];              // is this neater? ... it's more concise because it would otherwise be 2 lines, but harder to read. Not sure I like it but it is a thing
                /*/
                const [e1, e2] = eventCache.values();                                       // get both values (event objects)
                const {midX, midY} = calcMidpoint(e1, e2);
                
                console.log(`midX: ${pad(midX)}, midY: ${pad(midY)}`);
                const t = pinchTarget;

                pinch = { 
                            start: {
                                distance: calcDistance(e1, e2),
                                width: t.width,
                                height: t.height,
                                zoomCentreX: (midX - t.offsetLeft) / t.width,
                                zoomCentreY: (midY - t.offsetTop) / t.height
                            }
                        };

                console.log(`pinch dist: ${pinch.start.distance}, zoomCentreX: ${pinch.start.zoomCentreX}, zoomCentreY: ${pinch.start.zoomCentreY}`);
            }
        }


        function calcDistance(e1, e2)
        {
            return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));                              // pythag
        }

        const mid = (p1, p2) => Math.abs(p1 - p2) / 2 + Math.min(p1, p2);                           // calculate the centre point between two coordinate values - ie x1(300) and x2(40) = abs(40-300) / 2 + min(40, 300) = 170
        
        function calcMidpoint(e1, e2)
        {
            return { midX: mid(e1.x, e2.x), midY: mid(e1.y, e2.y) };
        }

        let pad = (num) => (Math.floor(num) + '').padStart(3, '0');


        function pointermoveHandler(e)
        {
            e.preventDefault();
            let id = e.pointerId;

            if(eventCache.has(id))
            {
                eventCache.set(id, e);                                                              // is this required? Is a new event created on move?

                if(eventCache.size === 2)
                {
                    const events = [...eventCache.values()];                // Array.from / spread isn't redundant, because the spread uses the iterator, leaving it broken for the second spread, so creating an array here is necessary
                    const {distance, width, height, zoomCentreX, zoomCentreY} = pinch.start;
                    let ori = distance;
                    let now = calcDistance(...events);
                    const {midX, midY} = calcMidpoint(...events);
                    let zoomRatio = (ori / now);                                                // ratio of the difference
                    let newWidth = width / zoomRatio;                                           // scale the width by the ratio
                    let newHeight = height / zoomRatio;                                         // scale the height by the ratio
                    const t = pinchTarget;

                    if(t.getContext)                                                            // if this is a canvas ...
                    {
                        t.width = newWidth;
                        t.height = newHeight;
                        
                        drawGrid(canvas.width, canvas.height, 27, 27, "#ccc");
                        drawGrid(canvas.width, canvas.height, 9, 9, "black");
                    }

                    t.style.height = `${newHeight}px`;
                    t.style.left = `${midX - (newWidth * zoomCentreX)}px`;
                    t.style.top = `${midY - (newHeight * zoomCentreY)}px`;
                }
            }
        }


        function drawGrid(canvasWidth, canvasHeight, hDivisions, vDivisions, colour)
        {
            context.beginPath();
            context.strokeStyle = colour;
            context.lineWidth = 1;

            let divWidth = canvasWidth / hDivisions;
            for (let i = 1; i < hDivisions; i++) 
            {
                const x = (divWidth*i) + 0.5;
                context.moveTo(x, 0);
                context.lineTo(x, canvasHeight);
            }
            
            let divHeight = canvasHeight / vDivisions;
            for (let i = 1; i < vDivisions; i++) 
            {
                const y = (divHeight*i) + 0.5;
                context.moveTo(0, y);
                context.lineTo(canvasWidth, y);
            }

            context.stroke();
        }


        function enableImage()
        {
            pinchTarget = document.querySelector('img#reference');
            buttonClass('hidden', 'locked');
            buttonClass('selected', 'image');
            buttonClass('', 'unlocked', 'grid');
        }

        function enableGrid()
        {
            pinchTarget = document.querySelector('canvas#grid');
            buttonClass('selected', 'grid');
            buttonClass('hidden', 'locked');
            buttonClass('', 'unlocked', 'image');
        }

        function lock()
        {
            pinchTarget = null;
            buttonClass('', 'locked');
            buttonClass('hidden', 'unlocked');
            buttonClass('disabled', 'image', 'grid');
        }

        const classList = (selector) => document.querySelector(selector).classList;

        function flipToggle()
        {
            classList('img#reference').toggle('flipped');
            buttonClassToggle('hidden', 'flip', 'flop');
            img.style.left = -(parseInt(img.style.left) + img.clientWidth - window.innerWidth) + 'px';
            canvas.style.left = -(parseInt(canvas.style.left) + canvas.clientWidth - window.innerWidth) + 'px';
        }

        function buttonClass(clazz, ...buttons)
        {
            buttons.forEach(button => classList('svg#' + button).value = clazz);
        }
        function buttonClassToggle(clazz, ...buttons)
        {
            buttons.forEach(button => classList('svg#' + button).toggle(clazz));
        }

        let getFile = null;                                                                 // reference to an optional function (not used in tamperMonkey version)

        setTimeout(() =>
        {
            Object.entries({
                "svg#image": enableImage,
                "svg#grid": enableGrid,
                "svg#flip": flipToggle,
                "svg#flop": flipToggle,
                "svg#browseFile": getFile,
                "svg#locked": enableImage,
                "svg#unlocked": lock,
            })
            .forEach(([selector, func]) => 
                    {   
                        const element = document.querySelector(selector);               // get the element by selector
                        func ?                                                          // if the click function exists ...
                            (element.onclick = func) :                                      // wire up the click
                                (element.classList.value = 'hidden');                           // ELSE hide the button (tamperMonkey version will auto-hide any buttons if we don't package the click function (outside SCRIPT comment region))
                    });
            
            body.onpointerdown = pointerdownHandler;
            body.onpointermove = pointermoveHandler;
            body.onpointerup = pointerupHandler;
            body.onpointercancel = pointerupHandler;
            body.onpointerout = pointerupHandler;
            body.onpointerleave = pointerupHandler;

            drawGrid(canvas.width, canvas.height, 27, 27, "#ccc9");
            drawGrid(canvas.width, canvas.height, 9, 9, "#0009");
        }, 10);

})();