;(function () {
    var main = document.getElementById('main')
    var game = document.getElementById('game')
    var form = document.getElementById('command-form')
    var cmd = document.getElementById('command')
    var startBtn = document.getElementById('start')
    var VampireP
    var startTime

    var isWaiting = true
    var meters = 0
    var interval
    var item
    var ammo
    var weapon
    var record = window.localStorage ? +window.localStorage['text_runner_record'] || 0 : 0
    
    var startItem = {
        next: ['start'],
        run: function () {
            step()
        }
    }


    var defaultCommands = {}

    var gameCommands = {
        shoot: function () {
            if (!weapon)
                return say('You don\'t have any weapon', 'warning')
            if (weapon.ammo <= 0)
                return say('You don\'t have any arrows left, try to <span class="suggest">reload</span>', 'warning')

            weapon.ammo--
            var closestVampire = Vampires.sort(function (z1, z2) { return z2.meters - z1.meters })[0]
            if (!closestVampire)
                return say('There is no Vampire, you wasted an arrow')

            var i = Vampires.indexOf(closestVampire)
            Vampires.splice(i, 1)
            if (!Vampires.length)
                return say('You killed the last Vampire, you can take a breath', 'success')

            say('You killed a Vampire, there ' + (Vampires.length == 1 ? 'is one Vampire' : 'are ' + Vampires.length + ' Vampires') + ' left', 'success')
        },

        reload: function () {
            if (!weapon)
                return say('You don\'t have any weapon to rearm', 'warning')
            if (ammo <= 0)
                return say('You don\'t have any arrows left')

            ammo--
            weapon.ammo = 4
            say('You rearmed your bow', 'success')
        }
    }

    var lastGunAt = 0
    var nextItems = {
        Vampire: function () {
            var i = rand(0, 1)
            console.log('next Vampire', i)
            if (i === 0)
                return 'VampireLeft'
            return 'VampireRight'
        },

        gun: function () {
            if (meters - lastGunAt < 20 || ammo >= 2)
                return 'floor'
            if (weapon)
                return 'ammo'

            lastGunAt = meters
            return 'gun'
        }
    }

    var items = {
        start: {
            description: 'You have one Vampire following you, you better <span class="suggest">run</span>!',
            next: ['floor'],
            run: function () { step() },
            jump: function () { step() }
        },

        floor: {
            next: ['floor', 'floor', 'floor', 'floor', 'wall', 'wall', nextItems.Vampire, nextItems.gun],
            run: function () { step() },
            jump: function () { step() }
        },

        wall: {
            next: ['floor'],
            description: 'You came to a wall',
            color: 'warning',
            run: function () {
                say('You cannot run through a wall, try to <span class="suggest">jump</span> it', 'warning')
            },

            jump: function () {
                say('You jumped the wall', 'success')
                step()
            }
        },

        VampireRight: {
            description: 'A Vampire growls at your right',
            color: 'warning',
            next: ['floor'],
            __init: function () {
                addVampire(meters - 4)
            },
            run: function () {
                say('You ran into the Vampire and it bit you. You had to dodge it going <span class="suggest">left</span>', 'fail'),
                die()
            },
            jump: function () {
                say('You jumped into the Vampire and it bit you. You had to dodge it going <span class="suggest">left</span>', 'fail')
                die()
            },
            left: function () {
                say('You dodged the Vampire!', 'success')
                step()
            },
            right: function () {
                say('You ran into the Vampire and it bit you. You had to dodge it going <span class="suggest">left</span>', 'fail'),
                die()
            }
        },

        VampireLeft: {
            description: 'A Vampire shrieks at your left',
            color: 'warning',
            next: ['floor'],
            __init: function () {
                addVampire(meters - 2)
            },
            run: function () {
                say('You ran into the Vampire and it bit you. You had to dodge it going <span class="suggest">right</span>', 'fail'),
                die()
            },
            jump: function () {
                say('You jumped into the Vampire and it bit you. You had to dodge it going <span class="suggest">right</span>', 'fail')
                die()
            },
            right: function () {
                say('You dodged the Vampire!', 'success')
                step()
            },
            left: function () {
                say('You ran onto the Vampire and it bit you. You had to dodge it going <span class="suggest">right</span>', 'fail'),
                die()
            }
        },

        gun: {
            description: 'You found a bow. You can <span class="suggest">grab</span> it or keep <span class="suggest">run</span>ning',
            next: ['floor'],
            grab: function () {
                weapon = { ammo: 4 }
                say('You took the bow, now you can <span class="suggest">shoot</span> the Vampires', 'success')
                step(0)
            },
            run: function () {
                step()
            },
            jump: function () {
                step()
            }
        },

        ammo: {
            description: 'You found an arrow, you can <span class="suggest">grab</span> them or keep <span class="suggest">run</span>ning',
            next: ['floor'],
            grab: function () {
                ammo++
                say('You took ammo', 'success')
                step(0)
            },
            run: function () {
                step()
            },
            jump: function () {
                step()
            }
        }
    }

    var Vampires = []

    cmd.focus()

    document.body.onclick = function () {
        cmd.focus()
    }

    form.onsubmit = function (e) {
        e.preventDefault()
        var command = cmd.value.trim().toLowerCase()
        if (command) {
            if (isWaiting) {
                if (command === 'run') {
                    start()
                    doCommand(command)
                }
            } else {
                doCommand(command)
            }
        }
        cmd.value = ''
        cmd.focus()
        return false
    }


    function start () {
        game.innerHTML = ''
        isWaiting = false
        meters = 0
        Vampires = []
        weapon = null
        ammo = 0
        startTime = Date.now()

        addVampire(-3)
        item = startItem
        step()
        cmd.focus()
        interval = setTimeout(loop, 1000)
    }

    function die () {
        if (interval)
            clearTimeout(interval)
        cmd.value = ''

        var sec = Math.floor((Date.now() - startTime) / 1000)
        if (sec > record) {
            record = sec
            if (window.localStorage)
                localStorage['text_runner_record'] = record
        }

        var dieMessage = 'You escaped for <span class="success">' + sec + '</span> seconds'
        if (record) {
            if (record === sec)
                dieMessage += '<br>This is your best time!'
            else
                dieMessage += '<br>Your best time is <span class="success">' + record + '</span> seconds'
        }
        say(dieMessage)

        game.appendChild(startBtn)
        isWaiting = true
        scroll()
    }

    function step(dist) {
        if (typeof dist === 'undefined')
            dist = 1
        meters += dist

        var nextItemName = randItem(item.next)
        if (typeof nextItemName === 'function')
            nextItemName = nextItemName()
        item = items[nextItemName]
        if (item.description)
            say(item.description, item.color)
        if (item.__init)
            item.__init()
        commands = assignMethods({}, defaultCommands, gameCommands, item)
    }


    function doCommand (text) {
        var command = commands[text]
        var p = line('command-line ' + (command ? '' : 'invalid'))
        p.innerText = text
        scroll()

        if (command)
            command()
    }

    function addVampire(position) {
        Vampires.push({
            meters: position
        })
    }


    function loop () {
        var maxPosition = -1000
        // make Vampires walk
        Vampires.forEach(function (Vampire) {
            Vampire.meters++
            if (Vampire.meters > maxPosition)
                maxPosition = Vampire.meters
        })

        var distance = meters - maxPosition
        if (!Vampires.length) {

            addVampire(meters - 3)
            say('Another Vampire arrived and started to chase you')
            scroll()

            interval = setTimeout(loop, 2000)

        } else if (distance === 0) {

            say((Vampires.length > 1 ? 'Vampires' : 'The Vampire') + ' bit you. You didn\'t <span class="suggest">run</span> enough', 'fail')
            die()

        } else {

            var p = game.lastChild === VampireP ? VampireP : line()
            VampireP = p
            var distanceSpan = distance > 3 ? distance : '<span class="warning">' + distance + '</span>'
            p.innerHTML = [(Vampires.length == 1 ? 'The Vampire is ' : 'Vampires are '),
                distanceSpan,
                ' meter', (distance > 1 ? 's' : ''), ' behind you'].join('')
            scroll()

            interval = setTimeout(loop, 2000)
        }
    }




    /** utils */

    function say (text, type) {
        var p = line('info ' + (type || ''), )
        p.innerHTML = text
        scroll()
    }

    function line (type) {
        var p = document.createElement('p')
        p.className = 'line ' + (type || '')
        game.appendChild(p)
        return p
    }

    function rand (min, max) {
        return Math.floor(Math.random() * (max + 1 - min)) + min
    }

    function randItem(ar) {
        return ar[rand(0, ar.length - 1)]
    }

    function assignMethods (objects) {
        var ret
        for (var i = 0; i < arguments.length; i++) {
            var obj = arguments[i]
            ret = ret || obj
            for (var p in obj) {
                if (typeof obj[p] !== 'function')
                    continue
                ret[p] = obj[p]
            }
        }
        return ret
    }

    function scroll () {
        window.scrollTo(0, document.body.scrollHeight)
    }

//    document.querySelector(".play-music").addEventListener("click", () => {
//      if (!music.overworld.playing()) {
//         music.overworld.play();
//      }
//   })
//   document.querySelector(".stop-music").addEventListener("click", () => {
//       music.overworld.pause();
//   })

const sounds = new Howl({
  "src": [
    "./sounds/sounds.webm",
    "./sounds/sounds.mp3"
  ],
  "sprite": {
    "jump": [
      0,
      783.6734693877551
    ],
    "OKANDI_CMWIF_M8": [
      2000,
      259715.78231292518
    ],
    "run": [
      263000,
      313.4693877551058
    ]
  }
})

sounds.play('OKANDI_CMWIF_M8')
})()
