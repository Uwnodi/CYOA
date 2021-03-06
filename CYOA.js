// @ts-check

function ElliesStory() {

	let S = new Story("Ellies");

	class Flags {
		IsTookCuffs = false;
		IsTookGag = false;

		IsDoorOpen = false;

		IsEntryRead = false;

		/**@type {number} */
		CorrectButton = Math.round(Math.random() * 23);

		/**@type {number} */
		AtButton = null;
	}

	/**@type {Flags} */
	let flags;

	/**@type {Engine} */
	let E = null;

	/**Current Player */
	let C = null;

	S.OnStart = () => {
		E = S.Engine;
		C = E.Players[0];

		S.Flags = flags = new Flags();
	};

	S.OnReset = () => {
		S.Flags = flags = new Flags();
		var UpdatedRoom = {
			Name: ChatRoomData.Name,
			Description: ChatRoomData.Description,
			Background: "AbandonedBuilding",
			Limit: (ChatRoomCharacter.length + 1).toString(),
			Admin: ChatRoomData.Admin,
			Ban: ChatRoomData.Ban,
			Private: false,
			Locked: false
		}
		ServerSend("ChatRoomAdmin", { MemberNumber: Player.ID, Room: UpdatedRoom, Action: "Update" });
		ChatAdminMessage = "UpdatingRoom";
	};

	S.OnCharEnter = char => {
		
		E.ChatEmote("As you enter, the door slams shut behind you with the light, mechanical click of a closing lock. Before you is the wide interior of what appears to be an abbandoned warehouse");
		// Remove all players
		E.Players.splice(0);
		// Add the entering player
		E.Players.push(char);
		C = char;
		E.GotoLevel("Entrance", false);

		setTimeout(FollowUp, 3000);
		setTimeout(Explanation, 7000);
		setTimeout(Explanation2, 15000);

		E.ChangeRoomSettings(
			{
				Background: "AbandonedBuilding",
				Limit: (ChatRoomCharacter.length + 1).toString(),
				Locked: true,
				Private: false
			});
	};

	S.OnCharExit = char => { 
		if (ArrayRemove(E.Players, char)) {
			// Remove player if leaves and reset
			E.Reset()
		}
	};

	//Entrance
	{
		let r = new Level("Entrance");

		//Triggers
		let goDown = new Trigger("down");
		goDown.Action = () => E.GotoLevel("Basement");
		r.Triggers.push(goDown);

		let checkLocker = new Trigger("locker");
		checkLocker.Action = () => E.GotoLevel("Locker");
		r.Triggers.push(checkLocker);

		{
			let t = new Trigger("window");
			t.Action = function () {
				E.ChatEmote("You find a window, and it slides open at first try. Apparently someone was a bit careless with the security");
			};

			r.Triggers.push(t);
		}

		r.Entry = "The dim lights of closed and covered windows lights the room as you return your attention to the main hall. " +
			"You can check the " + checkLocker.Print() + " again or go (down) to the basement";

		S.Levels.push(r);
	}

	//Locker
	{
		let r = new Level("Locker");

		//Triggers
		let tryCuffs = new Trigger("cuff");
		tryCuffs.Action = function () {
			if (C.ItemPermission > 2) {
				E.ChatAction("You need to adjust your item permissions to perform this action")
			} else if (C.BlockItems.map(function(e) { return e.Name; }).indexOf('LeatherCuffs') >= 0) {
				E.ChatAction("Leather cuffs needs to be unblocked in your inventory to perform this action")
			} else {
				InventoryWear(C, "LeatherCuffs", "ItemArms", "Default", 40);
				ChatRoomCharacterUpdate(C);
				E.ChatEmote("The cuffs slide on nicely. There doesn't seem to be anything overly unusual about them");
				setTimeout(lock, 8000);

				flags.IsTookCuffs = true;
			}
		};

		let tryGag = new Trigger("gag");
		tryGag.Action = function () {
			if (C.ItemPermission > 2) {
				E.ChatAction("You need to adjust your item permissions to perform this action")
			} else if (C.BlockItems.map(function(e) { return e.Name; }).indexOf('BallGag') >= 0) {
				E.ChatAction("Normal ball gag needs to be unblocked in your inventory to perform this action")
			} else {
				InventoryWear(C, "BallGag", "ItemMouth", "Default", 45);
				InventoryLock(C, InventoryGet(C, "ItemMouth"), "ExclusivePadlock", 2313);
				ChatRoomCharacterUpdate(C)
				E.ChatEmote("The gag fits snugly between your lips to keep them appart. And a light mechanical sound and a 'click' sounds as the straps pull a bit together and a mechanism on the buckle locks it tightly in place");

				flags.IsTookGag = true;
			}
		};

		let goBack = new Trigger("back");
		goBack.Action = () => E.GotoLevel("Entrance");

		r.Prepare = level => {
			var d = "The locker contains";

			level.Triggers = [];

			var isContainsAny = false;

			if (!flags.IsTookCuffs) {
				d += " a set of leather cuffs";
				if (flags.IsTookGag) d += " You could try them on. (cuffs)"
				isContainsAny = true;
				level.Triggers.push(tryCuffs);
			}

			if (!flags.IsTookGag) {
				if (isContainsAny)
					d += " and";
				d += " a ball gag."
				if (!flags.IsTookCuffs) { d += " You could try them on. (cuffs) or (gag)" }
				else { d += " You could try it on. (gag)" }
				isContainsAny = true;
				level.Triggers.push(tryGag);
			}

			if (isContainsAny == false) {
				d = "The locker is empty";
			}

			level.Triggers.push(goBack);

			level.Entry = d + ". You could of course also go (back)";
		};

		S.Levels.push(r);
	}

	//Basement
	{
		let r = new Level("Basement");

		//Triggers
		let acceptFate = new Trigger("door");
		acceptFate.Action = () => E.ChatEmote("The door is simply too solid, and any attempt at prying it open seems meaningless");

		let lens = new Trigger("lens");
		lens.Action = function () {
			if (InventoryGet(C, "ItemArms") && InventoryGet(C, "ItemMouth")) {
				if (InventoryGet(C, "ItemArms").Asset.Name == "LeatherCuffs") {
					if (InventoryGet(C, "ItemArms").Property) {
						if (CharacterIsNaked(C) && InventoryGet(C, "ItemArms").Property.Restrain == "Both" && InventoryGet(C, "ItemMouth").Asset.Name == "BallGag") {

							var r = S.GetLevel("Basement");

							flags.IsDoorOpen = true;

							E.ChatEmote("The door opens");

							r.Entry = "With the door open you can now either go (through) the door or go (back) upstairs";

							E.GotoLevel("Basement");
						}
						else {
							E.GotoLevel("Hook");
						}
					}
					else {
						InventoryGet(C, "ItemArms").Property = { Restrain: null };
						E.GotoLevel("Hook");
					}
				}
				else {
					E.ChatEmote("The sensor moves a bit, but nothing seems to happen")
				}
			}
			else {
				E.ChatEmote("The sensor moves a bit, but nothing seems to happen")
			}
			for (var i = 0; i < ChatRoomCharacter.length; i++) {
				var X = ChatRoomCharacter[i]
				if (InventoryGet(X, "ItemVulva")) {
					if (InventoryGet(X, "ItemVulva").Asset.Name == "VibratingDildo") {
						if (!InventoryGet(X, "ItemVulva").Property) InventoryGet(X, "ItemVulva").Property = { Intensity: -1 }
						if (InventoryGet(X, "ItemVulva").Property.Intensity < 1) {
							InventoryGet(X, "ItemVulva").Property.Effect = ["Egged", "Vibrating"]
							InventoryGet(X, "ItemVulva").Property.Intensity = InventoryGet(X, "ItemVulva").Property.Intensity + 1
							ServerSend("ChatRoomChat", { Content: "Dildo" + ((1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(X, "ItemVulva").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: X.Name, MemberNumber: X.MemberNumber }] })
							CharacterLoadEffect(X)
							ChatRoomCharacterUpdate(X)
						} else {
							InventoryGet(X, "ItemVulva").Property.Effect = ["Egged", "Vibrating"]
							InventoryGet(X, "ItemVulva").Property.Intensity = InventoryGet(X, "ItemVulva").Property.Intensity - 1
							ServerSend("ChatRoomChat", { Content: "Dildo" + ((-1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(X, "ItemVulva").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: X.Name, MemberNumber: X.MemberNumber }] })
							CharacterLoadEffect(X)
							ChatRoomCharacterUpdate(X)
						}
					}
				}
			}
		};

		let goThroughDoor = new Trigger("through")
		goThroughDoor.Action = function () {
			E.GotoLevel("Room2");
			if (C.BlockItems.map(function(e) { return e.Name; }).indexOf('VibratingDildo') >= 0) {
				setTimeout(dildo, 2000);
			}
			E.ChangeRoomSettings({ Background: "VaultCorridor" });
		}

		let goBack = new Trigger("back");
		goBack.Action = () => E.GotoLevel("Entrance");

		r.Prepare = level => {
			var d = "At the end of the basement stairs is a large metal door with the picture of a naked girl with her arms cuffed at her wrist and elbows behind her back, and a ballgag strapped tight between her lips. " +
				"Next to the door is some kind of lens. You could try to get the " + acceptFate.Print() + " open, go " + goBack.Print() + " upstairs, or stand in front of the (lens)";

			level.Triggers = [];

			if (!flags.IsDoorOpen) {
				level.Triggers.push(lens);
				level.Triggers.push(acceptFate);
			} else {
				d = "With the door open you can now either go " + goThroughDoor.Print() + " the door, or go" + goBack.Print() + " upstairs";
				level.Triggers.push(goThroughDoor);

			}
			level.Triggers.push(goBack);

			level.Entry = d;
		};

		S.Levels.push(r);
	}

	//Hook
	{
		let r = new Level("Hook");

		//Triggers
		let hookCloth = new Trigger("cloth");
		{
			hookCloth.Action = function () {
				E.ChatEmote("The hook seems like it almost was made for this, and it even moves a bit to swiftly tear up your clothes, then retracts back into the wall. Standing in front of the (lens) again might extend it once more");
				CharacterNaked(C);
				ChatRoomCharacterUpdate(C);
				E.GotoLevel("Basement", false);
			};
			r.Triggers.push(hookCloth);
		}
		let struggle = new Trigger("gag");
		{
			struggle.Action = function () {
				E.ChatEmote("The hook retracts back into the wall at any attempt at moving the gag close to it. Maybe standing in front of the (lens) again will extend it again?");
				E.GotoLevel("Basement", false);
			};
			r.Triggers.push(struggle);
		}
		let hookCuff = new Trigger("cuff");
		{
			hookCuff.Action = function () {
				DialogFocusItem = InventoryGet(C, "ItemArms");
				if (DialogFocusItem.Property == null) DialogFocusItem.Property = { Restrain: null };
				if (InventoryGet(C, "ItemArms").Property.Restrain != "Both") {
					var NewPose = "Both"
					DialogFocusItem.Property.Restrain = NewPose;
					DialogFocusItem.Property.SetPose = [(NewPose == "Wrist") ? "BackBoxTie" : "BackElbowTouch"];
					DialogFocusItem.Property.Effect = ["Block", "Prone"];
					DialogFocusItem.Property.SelfUnlock = (NewPose == "Wrist");
					if (NewPose == "Both") DialogFocusItem.Property.Difficulty = 45;
					CharacterRefresh(C);
					ChatRoomCharacterUpdate(C)
					E.ChatEmote("The hook moves and swiftly makes sure your cuffs are connected both at Wrists and Elbows. Maybe it will trigger again if you move something else close to it as well (hook gag), (hook clothes)")
				} else {
					E.ChatEmote("The cuffs slide onto the hook, but they're simply too sturdy to go anywhere. Maybe something else can trigger it (gag) or (clothes)")
				}
			};
			r.Triggers.push(hookCuff);
		}

		r.Entry = "The sensor moves a bit, before a panel opens and a hook extends from the wall. Maybe somthing can be hooked onto it. (gag), (cuffs) or (clothes)";

		S.Levels.push(r);
	}

	//Room2
	{
		let r = new Level("Room2");

		//Triggers
		let acceptFate = new Trigger("door");
		{
			acceptFate.Action = () => E.ChatEmote("The door seems to have locked behind you leaving no way back at the current moment.");
			r.Triggers.push(acceptFate);
		}
		let struggle = new Trigger("platform");
		{
			struggle.Action = function () {
				InventoryWear(C, "SpreaderMetal", "ItemFeet", "Default", 20);
				InventoryWear(C, "Corset5", "ItemTorso", C.LabelColor, 20)
				ChatRoomCharacterUpdate(C);
				E.GotoLevel("Stuck");
			};
			r.Triggers.push(struggle);
		}

		r.Entry = "The door closes behind you" + acceptFate.Print() + " as you enter a round room, with a slightly elevated platform in the middle (stand on the platform)";

		S.Levels.push(r);
	}

	//several stages of stuck
	{
		let r = new Level("Stuck");

		//Triggers
		let sameAction = () => {
			InventoryWear(C, "VibratingDildo", "ItemVulva", "Default", 20)
			InventoryWear(C, "OneBarPrison", "ItemDevices", "Default", 20)
			ChatRoomCharacterUpdate(C)

			if (!InventoryGet(C, "ItemVulva").Property) InventoryGet(C, "ItemVulva").Property = { Intensity: -1 }
			
			InventoryGet(C, "ItemVulva").Property.Effect = ["Egged", "Vibrating"]
			InventoryGet(C, "ItemVulva").Property.Intensity = InventoryGet(C, "ItemVulva").Property.Intensity + 4
			ServerSend("ChatRoomChat", { Content: "Dildo" + ((1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(C, "ItemVulva").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: C.Name, MemberNumber: C.MemberNumber }] })
			CharacterLoadEffect(C)
			ChatRoomCharacterUpdate(C)

			E.GotoLevel("Stuck2");
		};

		let acceptFate = new Trigger("relax");
		acceptFate.Action = sameAction;
		r.Triggers.push(acceptFate);

		let struggle = new Trigger("struggle");
		struggle.Action = sameAction;
		r.Triggers.push(struggle);

		r.Entry = "A light mechanical clatter fills the room, and small metal panels open on the platform, extending mechanical arms to grab and lock a set of cuffs with a spreader between your ankles." +
			" More mechanical arms extend to snare a corset around your waist so it squeezes you tightly. The arms then lock in place to keep you still, while a pole extends towards your crotch from below, with a vibrating dildo at the end. You can " + struggle.Print() + " or try to " + acceptFate.Print() + "and accept your fate";

		S.Levels.push(r);
	}
	{
		let r = new Level("Stuck2");

		let sameAction = () => {

			InventoryRemove(C, "ItemDevices")
			InventoryWear(C, "PolishedChastityBelt", "ItemPelvis", "Default", 20)
			ChatRoomCharacterUpdate(C)

			E.GotoLevel("Stuck3");
		};

		let acceptFate = new Trigger("relax");
		acceptFate.Action = sameAction;
		r.Triggers.push(acceptFate);

		let struggle = new Trigger("struggle");
		struggle.Action = sameAction;
		r.Triggers.push(struggle);

		r.Entry = "The pole pushes the vibrating dildo deep between your pussy lips. The mechanical arms keeps firmly locked around your waist while another set extends to lock a chastity belt over the dildo. You can still (struggle) or (relax)"

		S.Levels.push(r);
	}
	{
		let r = new Level("Stuck3");

		let sameAction = () => {

			InventoryWear(C, "Stockings1", "Socks", "Default", 20)
			InventoryWear(C, "HarnessPanelGag", "ItemMouth2", "Default", 20)
			InventoryRemove(C, "ItemFeet")
			ChatRoomCharacterUpdate(C)
			E.ChatEmote("The ankle cuffs loosen and is pulled down under the floor. With the vibrator buzzing, a female voice can be heard speaking through the room.")
			setTimeout(Welcome, 5000);
			setTimeout(NowYouAreStuck, 10000);
			setTimeout(AWayOut, 15000);
			setTimeout(goToKeyRoom, 20000)
			setTimeout(setVibe, 15000);
		};

		let acceptFate = new Trigger("relax");
		acceptFate.Action = sameAction;
		r.Triggers.push(acceptFate);

		let struggle = new Trigger("struggle");
		struggle.Action = sameAction;
		r.Triggers.push(struggle);

		r.Entry = "The pole retracts, and the belt is secured tightly. With the belt securely in place, the ankle cuffs expand a little to allow a bit of fabric to be pulled up over your feet and underneathe the cuffs. the cuffs then move up along your legs while expanding to roll a pair of soft stockings onto your thighs. Another pair of arms extends, one to grab your hair, the other to secure a panel over that ball gag. (relax) or (struggle)"

		S.Levels.push(r);
	}

	//press the right button game:
	{
		let r = new Level("KeyRoom");

		let foot = new Trigger("foot");
		foot.Action = () =>
			E.ChatEmote('As you bring your foot close to the button it retracts into the floor, and the voice echoes through the room. "Sorry, but that is cheating. You will have to kneel down to press it."');

		let moveToButton = new Trigger("crawl to button");
		{
			moveToButton.Regex = /^(?:crawl[s]? to button)\s+([0-9]+)$/i;
			moveToButton.Action = txt => {
				if (InventoryGet(C, "ItemLegs")){
					E.ChatEmote("You can't move with your legs bound. You will have to struggle out")
				} else {
					let b = parseInt(txt.match(moveToButton.Regex)[1]);
					flags.AtButton = b;
					E.ChatEmote("Now at button " + b + ", you can press it(press button " + b + "), or crawl to a different button (crawl to button <n>)");
				}
			}
		}

		let buttonClickAction = () => {
			//Pressing the button we currently on
			var rng = Math.round(Math.random() * 5)
			if (flags.AtButton == flags.CorrectButton) {
				//Correct button
				E.ChatEmote("As you press the button you hear a light 'click' and the door opens behind you leaving the exit free.");
				UnlockRoom();
				E.GotoLevel("EscapeChance");
			} else if (rng ==3 ) {
				InventoryWear(C, "NylonRope", "ItemLegs", InventoryGet(C, "HairFront").Color, 0)
				ChatRoomCharacterUpdate(C)
				E.ChatEmote("More mechanical arms extend from the floor, swiftly snaring together your legs to make movement harder. To proceed you will have to struggle out")
			} else if (rng >3 && C.BlockItems.map(function(e) { return e.Name; }).indexOf('VibratingButtplug') == -1) {
				if (!InventoryGet(C, "ItemButt") || InventoryGet(C, "ItemButt").Asset.Name != "VibratingButtplug") {
					E.ChatEmote("A panel opens on the floor, just behind you, extending an arm to shove a butt plug through an opening on your castity belt, then swiftly closes it")
					InventoryWear(C, "VibratingButtplug", "ItemButt", "Default", 20)
					if (!InventoryGet(C, "ItemButt").Property) InventoryGet(C, "ItemButt").Property = { Intensity: -1 }
					ChatRoomCharacterUpdate(C)
				} else if (InventoryGet(C, "ItemButt").Property.Intensity < 4) {
					InventoryGet(C, "ItemButt").Property.Effect = ["Egged", "Vibrating"]
					InventoryGet(C, "ItemButt").Property.Intensity = InventoryGet(C, "ItemButt").Property.Intensity + 1
					ServerSend("ChatRoomChat", { Content: "Buttplug" + ((1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(C, "ItemButt").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: C.Name, MemberNumber: C.MemberNumber }] })
					CharacterLoadEffect(C)
					ChatRoomCharacterUpdate(C)
					setVibe()
					E.ChatEmote("This button simply turns up the plug, and adjusts the intensity of the vibrator")
				} else {
					//Wrong button
					E.ChatEmote("The button doesn't do anything, it simply sets the intensity of your vibrator");
					setVibe();
				}
			} else {
				//Wrong button
				E.ChatEmote("The button doesn't do anything, it simply sets the intensity of your vibrator");
				setVibe();
			}
		};

		let pressSpecificButton = new Trigger("press button");
		{
			pressSpecificButton.Regex = /(?:press)(?:es|ed)?(?: button)? ([0-9]+)/i;
			pressSpecificButton.Action = txt => {
				let b = parseInt(txt.match(pressSpecificButton.Regex)[1]);

				if (C.ActivePose == null) {
					//Standing
					flags.AtButton = b;
					E.ChatEmote("You walk up to button " + b + " but it can't be reached while standing.");
					return;
				}
				//Otherwise kneeling

				if (flags.AtButton == b || flags.AtButton == null) {
					//Pressing the button we currently on
					flags.AtButton = b;
					buttonClickAction();
				} else {
					E.ChatEmote("That button is too far away, you can stand up to walk there, or (crawl to button <number>) to remain on your knees.");
				}
			};
		}

		let justPress = new Trigger("press");
		{
			justPress.Regex = /press(es|ed)?/i;
			justPress.Action = txt => {
				if (flags.AtButton == null) {
					//Not on any button, ignore
					return;
				}

				if (C.ActivePose == null) {
					E.ChatEmote("The button can't be reached while standing.");
					return;
				}

				buttonClickAction();
			};
		}

		let standsUp = new Trigger("standup");
		standsUp.Type = Trigger.Types.Action;
		standsUp.Action = txt => {
			flags.AtButton = null;
			E.ChatEmote("The chastity belt sends a sharp, electric jolt through your body as you stand up");
			E.ChatEmote("Standing up makes it easy to move around. You simply need to kneel down again, to press the button you want (press button <n>)");
		};

		let orgasmResist = new Trigger("orgasmresist");
		orgasmResist.Type = Trigger.Types.Activity;

		let cum = new Trigger("orgasm");
		cum.Type = Trigger.Types.Activity;
		cum.Regex = /(orgasm|cum|cumming)/i;
		cum.Action = () => {
			if (InventoryGet(C, "ItemLegs")){
				E.ChatEmote('Mechanical arms extend from the ground to cut the ropes again and free your legs.')
				InventoryRemove(C, "ItemLegs")
				ChatRoomCharacterUpdate(C)
			}
			E.GotoLevel("Doomed");
		}

		r.Triggers.push(foot);
		r.Triggers.push(moveToButton);
		r.Triggers.push(standsUp);
		r.Triggers.push(pressSpecificButton);
		r.Triggers.push(justPress);
		r.Triggers.push(orgasmResist);
		r.Triggers.push(cum);

		r.Prepare = level => {
			var d;
			if (flags.IsEntryRead == false || flags.AtButton == null) {
				d = "Several small panels open on the floor, accross the room and tiny stands, with numbered buttons between 0 and 23, extend. The buttons are all the way down on the floor, so either you can try pressing one with your foot(press button <number> with foot), or you will have to kneel to reach them (press button <number>) (without <>)";
				flags.IsEntryRead = true;
			} else {
				d = "Now at button " + flags.AtButton + ", you can try to press it(press button "+ flags.AtButton + ") or crawl to another button(crawl to button <n>)"
			}

			level.Entry = d;
		};

		S.Levels.push(r);
	}

	//EscapeChance
	{ 
		let r = new Level("EscapeChance")

		let esc = new Trigger("escape");
		{
			esc.Action = function () {
				ChatRoomAdminChatAction("Kick", "/Kick " + C.MemberNumber.toString())
				E.Reset()
			}
			r.Triggers.push(esc)
		}
		let stay = new Trigger("stay");
		{
			stay.Action = function () {
				E.ChatEmote("After a short while the doors close again")
				E.GotoLevel("Doomed")
			}
			r.Triggers.push(stay)
		}
		r.Entry = "With all the doors open. you can choose either to surrender your freedom to your captor and (stay) behind to see who else might stumble into the warehouse, or you can (escape) through the open doors to get help with your predicament. (Warning: escaping will kick you out of the room so it can be updated for new players)"

		S.Levels.push(r);
	}

	//Doomed
	{ 
		let r = new Level("Doomed")

		let enter = new Trigger("enter the opening")
		{
			enter.Action = function () {
				var d = "The opening closes behind you, and mechanical arms grabs you to keep you in place while the floor starts moving upwards."
				if (!InventoryGet(C, "ItemNeck")) {
					InventoryWear(C, "LeatherChoker", "ItemNeck", "Default", 60)
					ChatRoomCharacterUpdate(C)
					d = d + " A leather collar is secured snugly around your neck so it hugs your skin all the way around, and"
				}
				InventoryWear(C, "CollarNameTag", "ItemNeckAccessories", "#ffffff", 20)
				DialogFocusItem = InventoryGet(C, "ItemNeckAccessories");
				if (DialogFocusItem.Property == null) DialogFocusItem.Property = { Type: null };
				DialogFocusItem.Property.Type = "Slave";
				DialogFocusItem.Property.Effect = [];


				CharacterRefresh(C);
				ChatRoomCharacterUpdate(C);
				d = d + " A tag with the word 'slave' on it is attached to your collar."
				E.ChatEmote(d)

				if (InventoryGet(C, "ItemButt")){
					if (InventoryGet(C, "ItemButt").Asset.Name == "VibratingButtplug") {
						InventoryGet(C, "ItemButt").Property.Intensity = InventoryGet(C, "ItemButt").Property.Intensity - 3
						ServerSend("ChatRoomChat", { Content: "Buttplug" + ((1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(C, "ItemButt").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: C.Name, MemberNumber: C.MemberNumber }] })
						CharacterLoadEffect(C)
						ChatRoomCharacterUpdate(C)
					}
				}

				setTimeout(arrival, 9000)
			}
			r.Triggers.push(enter)
		}

		r.Entry = 'The buttons retract down into the floor and a hidden panel on the wall at the side of the room opens up. The voice from earlier resounds across the room. "seems you are mine then". The opening can be entered (enter the opening) beyond that the room is just empty.'

		S.Levels.push(r)
	}

	function FollowUp(a) {
		E.ChatEmote("- The warehouse is fairly big, but mostly empty. There's a (locker) you can check out on the wall to the right, or you can head (down) the stairs to the left, into the basement")
	}
	function Explanation(r) {
		E.ChatEmote("Type an emote containing (*locker) or (*down) into chat, to get started.")
	}
	function Explanation2() {
		E.ChatAction("triggers have to be emotes to work")
	}
	function Welcome() {
		E.ChatEmote('"Congratulations, ' + C.Name + ', on finding your way in here. It has been a pleassure watching you get yourself into this position"')
	}

	function NowYouAreStuck() {
		E.ChatEmote('"You are now my captive"')
	}

	function AWayOut() {
		E.ChatEmote('"I will offer you a way out though. If you can find the button that opens the door without cumming, I will let you go. Otherwise you will be kept here as my toy and pet. Or possibly sold away as a slave"')
	}

	function goToKeyRoom() {
		E.GotoLevel("KeyRoom");
	}
	function arrival() {
		E.ChatEmote("Finally you arrive at the control room to meet your captor, and you can see the redheaded woman watching you with a calm smile. The room has a good overlook to the warehouse, and several screens to keep track of anyone that might enter")
		ServerSend("ChatRoomAdmin", { MemberNumber: C.MemberNumber, Action: "MoveLeft", Publish: false});	
		E.Reset();
	}

	function lock() {
		E.ChatEmote("After a few seconds, a light mechanical click can be hear from the mechanic buckles on the leather cuffs as they tighten slightly and locks themselves in place")
		InventoryLock(C, InventoryGet(C, "ItemArms"), "ExclusivePadlock", 2313);
		ChatRoomCharacterUpdate(C)
	}

	function dildo() {
		E.ChatEmote("(You seem to have vibrating dildo blocked in your inventory, this part only works properly if you unblock it)")
	}

	function UnlockRoom() {
		// Allow player to exit but keep the room private until then
		E.ChangeRoomSettings(
			{
				Background: "AbandonedBuilding",
				Limit: (ChatRoomCharacter.length + 1).toString(),
				Private: true,
				Locked: false
			});
	}

	function setVibe() {
		if (!InventoryGet(C, "ItemVulva").Property) InventoryGet(C, "ItemVulva").Property = { Intensity: -1 }
		if (InventoryGet(C, "ItemVulva").Property.Intensity < 3) {
			InventoryGet(C, "ItemVulva").Property.Effect = ["Egged", "Vibrating"]
			InventoryGet(C, "ItemVulva").Property.Intensity = InventoryGet(C, "ItemVulva").Property.Intensity + 1
			ServerSend("ChatRoomChat", { Content: "Dildo" + ((1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(C, "ItemVulva").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: C.Name, MemberNumber: C.MemberNumber }] })
			CharacterLoadEffect(C)
			ChatRoomCharacterUpdate(C)
		} else {
			InventoryGet(C, "ItemVulva").Property.Effect = ["Egged", "Vibrating"]
			InventoryGet(C, "ItemVulva").Property.Intensity = InventoryGet(C, "ItemVulva").Property.Intensity - 1
			ServerSend("ChatRoomChat", { Content: "Dildo" + ((-1 > 0) ? "Increase" : "Decrease") + "To" + InventoryGet(C, "ItemVulva").Property.Intensity, Type: "Action", Dictionary: [{ Tag: "DestinationCharacterName", Text: C.Name, MemberNumber: C.MemberNumber }] })
			CharacterLoadEffect(C)
			ChatRoomCharacterUpdate(C)
		}
	}

	return S;
}