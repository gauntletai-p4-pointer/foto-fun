- objects are moved when holding and dragging regardless of what tool is selected (which tool should this be the case for?)
- no failure handling when agent errors out

- adjustable ui, especially right panel - agent chat is getting cut off on the right side because currently not wide enough
- "horizontal type tool", "vertical type tool", and some others have the exact same icon
- the three checkboxes near the top "auto-select", "show transform controls", "show alignment guides" don't do anything 
- selection tools don't do anything (probably need to be implemented as pixel editing)
- using the rectangular marquee and elliptical marquee tools creates a flashing dot where the tool was first clicked
- the elliptical marquee tool's selection behaves strangely: the center follows the cursor. the cursor should dictate the opposite end of the ellipse, while the starting position stays constant
- magic wand tool should just be a one-click tool, not an area select
- spacebar+drag panning is choppy
- hand tool panning is also choppy, but also creates maximum update depth console errors
- some tools have the same hotkeys (e.g. magic wand and quick selection tools both use "w")
- selection tools 

- zoom keyboard shortcuts don't work other than ctrl+0 and ctrl+1