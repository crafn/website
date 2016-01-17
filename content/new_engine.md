### C or C++ for my game engine?
I decided to rewrite my C++ game engine in C about a year ago. Failing with C++ was my own fault of course, and part of the learning process. In this post I'll explain how I ended up deserting the old friend.

Let's set up a context for the discussion by first specifying what I want from a language in terms of game development, and then move onto more specific comparison. At the end I'll provide a short summary which I hopefully have justified in the lengthy middle part. For the whole time I'm talking about codebases of the order of 100k lines, something a single person can write during a few years, so my reasoning doesn't automatically apply to small, or really large games.

My main goal is to write a game engine and a game. I have creative interest for the game, and technical interest for the game engine, as in making something technically impressive. I'd probably get the game done faster if I didn't make this slightly artificial separation of the engine and the game, but that doesn't fit my interests. This leads to the point: maintaining interest, motivation, is the primary focus for me, because when I lose interest, my productivity drops to zero, maybe for months. Anything which merely deviates my productivity is secondary. Therefore, when I compare the languages I mostly focus on issues which make me frustrated, or incur mental overhead. Some people are not so easily frustrated. Good for them.

It should be noted, that idiomatic C has a very different philosophy behind it than idiomatic C++. If you haven't internalized these philosophies, it's very easy to mistake the opposite side as an old crank complaining about modern times, or as a language consumer craving for new toys to play with. It's hard, maybe impossible to transition smoothly from one side to the other by comparing single features in isolation. Meaning, that if you only know one side, you'll see every individual argument in favor of the other side as a crack in your philosophy, and therefore wrong. To prevent this, a more holistic approach is required, where each side is considered as a whole. This is why I'll try to go through all the issues in a single post, although I admit my decision to move to C was partly irrationally adventurous, and some benefits occurred only after the fact. I'll also try to focus on concrete matters, rather than discussing on high level, as staying abstract makes intentional misunderstanding too easy.

For the record, I think both C and C++ leave a lot to be desired in the context of demanding game development. I'd abandon both of them without much hesitation if there were something better around. But they're the best tools for the job, [at least for now...](https://github.com/BSVino/JaiPrimer/blob/master/JaiPrimer.md) New and hip GC'd languages don't care about the priorities efficient game engine code has. Safety-enforcing languages like Rust are going somewhat off already by definition, as they're focusing primarily on safety, which is not the focus for most game code.

I'll also allocate some space for "C/C++", as it's popular to resolve the C vs. C++ problem by saying that "with C++ you only pay for what you use." That's false even in the limiting case, where the code is written using the common subset of C and C++, and just using a C++ compiler will make my future options worse, as we'll see.

#### Iteration time

Doing unnecessary work, or waiting long periods of time demotivates and drives me to do something else. Let's look at the typical iteration loop, and see what we can do to improve it.

1. Observe a bug.
2. Shut down the game.
3. Change some code.
4. Wait for compilation (and linking).
5. Wait for the game to launch.
6. Navigate to the place where the bug occurred.
7. See if the bug was fixed.
8. Repeat if necessary.

Steps 1, 3, 7, and 8 are mandatory. The ideal is: Observe a bug. Change some code. See if the bug was fixed. Repeat if necessary.

The bug can be substituted by a design issue or a hard-to-quantify artistic subtlety.

##### Runtime recompiling

So I have the four steps 2, 4, 5 and 6, which stem from the need of recompiling the executable. Most say that I should just use a scripting language. With a scripting language I also get:

- to design how the semantics of the native language and/or the engine matches the scripting language
- extra worrying for the GC and general performance
- painful conversion back to static native code, if this turns out to be bad idea after I've written a dozen klocs of gameplay code
- arbitrary barriers for sharing code, which don't exist when using a single language
- a need to write and maintain glue code while developing other parts of the engine
- a need to adopt a 3rd party library (the wide variety of issues using 3rd party libraries is discussed later)

So, even though a scripting language would fix the situation, it also induces a huge amount of headache elsewhere. I believe we can do better by recompiling native code at run-time.

What I  need to do with C?

2, 5, and 6 are solved by not shutting the game down and keeping the game world in memory. By reloading a dynamic library one can effectively update the gameplay-related functions. This requires some work, like possibly re-querying function pointers, but that turned out to be a rather trivial thing, a one-time headache. I can't modify data structures though, because the game objects are kept in memory while reloading the dll. That is not a huge loss, because the main purpose is to be able to modify some game logic repeatedly to get it just right. I decided to keep the engine non-reloadable, but [that can also be done](https://handmadehero.org/).

Step 4, compiling, is already somewhat solved by choosing C, because it's relatively fast to compile by default. Staying at less than five seconds for a recompile doesn't require much of thinking. I'm currently using unity build scheme (build the whole source as a single file), but that might change when the full rebuild time increases over 5 seconds. Now at 25kloc it's about 3 seconds.

What I need to do with C++?

Much of the same applies with steps 2, 5, and 6. Except that I have to use extern C functions for those which the engine uses. When using OOP, like the idiomatic C++ coder does, I end up creating a bunch of wrapper functions. VTables are also problematic. They're global data to which objects have secret pointers to. If my DLL has those, I'm screwed when the DLL reloads to a different address, or when the compiler decides to use different layout for them. So I shouldn't instantiate templates like `std::function` in the DLL code. I shouldn't derive from classes with virtual member functions. Or if I do, I have to write a bunch of wrapper functions which can be given to the engine. It's pretty much a minefield which I walked over in the old engine. Still think it was worthwhile to move away from scripts though.

Then, compile times (4). At worst building my old engine (~80kloc) took 15 minutes and multiple gigabytes of memory. Link time was over a minute. Again, I can perform several tricks or play the tradeoff game, but performing tricks requires time and effort. Playing the neverending tradeoff game with issues that should be non-issues is consumptive. Mentally and temporally. And I'll never be as fast as I'd be with C. I spent several days rewriting, and removing templated code, optimizing the build, and got to something like 5min rebuild, and 10-20s incremental, most of which went to linking IIRC. 20s is still a lot to wait for repeated iteration.

At some point I got frustrated with the poor performance and bugginess of make, and wrote my own build system. It was mostly a good decision, although one should not have the need for a build system in the first place. The language is handicapped if I need another program besides the compiler to transform my source code to machine code.

Now I have dealt with the steps concerning unnecessary restart. I often need to modify engine datatypes though. Then even a scripting language won't help, the restart is mandatory. The effective measures now are to minimize the loading time (5) and the count of restarts (8). Navigating to the buggy situation (6) is often just a matter of saving and loading world state.


##### Minimizing the times of restart (8)
The step "Observe a bug" (1) is a bit optimistic. It is rather "examine and interact with the bug until you figure out why it happens." The figuring out itself can take multiple recompilations. Let's again compare how this goes for me in the two different cases.

With C++ I'll have to wait the debug build to compile a large portion of the code, because I normally use a "development" build which has some optimizations on. Those optimizations are needed for 60fps because the so called zero-overhead abstractions are costly when not optimized away. After a few minutes I have my debug build. It runs barely 30fps. With bad luck the bug won't reveal itself with such large dt. Then I have to use the optimized build for debugging, whoopee. In any case I'm headed for some bad time.

Why is debugging tedious? I'd like to say to the debugger things like: Draw a graph of this and that variable. Let me switch this boolean on and off while the game runs. Let me use a hotkey for that debugger action so that I can at the same time do the maneuver in-game which causes the bug. Break when this variable of the game object under my cursor has this value. Continue for x frames with this dt. View values of these variables in real-time, I can't stop because I'm debugging a net game.

But that's mostly utopia. Instead I get instantaneous slices of the program state. Huge call stacks going in and out of the standard library with templated calls spanning on two rows on my screen. Puzzles on how to get the debugger filter the breaks correctly on a crowded code path. Frustration when trying to get values out of the standard containers. Little hope of finding the thing I have under my mouse cursor in-game. In short, there's a huge gap between what information is easy to get out with the debugger, and what goes on while the game runs.

What I often did was printf debugging and `if (debug_key_pressed)` -type of things before I decided to go for the debugger. If it was a hard bug I'd drift to use a combination of both. In any case, it often meant trial and error, which meant multiple slow recompilations.

I can't really run the game in Valgrind to find memory errors, because it's unplayably slow, like several seconds per frame. If I'm willing to wait several minutes I can start and shut it down. That'd be like +10 minutes to the iteration loop.

With C I have the debug build already on my fingertips, because I use that to develop. That runs over 60fps with hardly any extra work, so I don't need a separate, optimized development build. It's fast not because of premature optimization, but because straightforward C code is relatively fast by default. There's not much cruft that would get optimized away but would slow down the debug build significantly.

I don't have the problem of dt-dependent bugs not showing up in the debug build.

I can run the debug build in Valgrind to find memory errors. It's barely playable (10fps) on a few years old laptop, but responsive enough to allow me to interact with it. That I get without spending time on profiling or optimizing beforehand.

Now comes the truly magical part, which I didn't anticipate when I started working on the engine. *I have a real-time editor of the whole program memory.*

This means I can hit a key and start browsing rendering, physics, and other managers while the game runs. I can click on members and change their values. I can list all game objects, view and modify the struct members as I like. Convenient formatting and GUI for custom types. This can be easily combined with features like "graw a graph of this value". When I work on a new engine feature and notice it doesn't work correctly, I can open up the memory editor and play with the struct members I just added. No foresight needed. No frameworks or wonky macros required. Just write plain C and it mostly works. Mostly, because this is the first time I implemented such a thing, so there's a few rough corners. The best part of it is that implementing such a system didn't take long. Maybe a day, less than two. It's Quick & Dirty reflection.

How does it work? Before compiling, I have a script to scan through the preprocessed source of my game and engine. It reads struct names, member names, their types, including how many `*` and `[]` there are. Nothing pretty, but works really well for a prototype. Then I output this information to a .c file. This gets compiled into the game. This info makes it possible to traverse all the data in my game in a tree-like manner, displaying it, and editing it. You could maybe implement the system faster by using debug information provided by the compiler, but I'm planning to expand it further, and it's nice to have a compiler-independent system. Note that the same system works for the dynamic code too, which is a win compared to a scripting language.

I guess this could also be possible with C++, but it's against OOP, meaning that I'd rather want to call getters and setters to view and modify things, and would require something like clang to parse my source code. And handling templates, ugh. Not quick nor easy anymore.

There is also another aspect which dictates how much time I have to spend on fixing bugs, simply the bug frequency. My typical bug with C usually gets caught in an assert. Sometimes things crash. Sometimes the call stack is corrupted. But I don't find that I would've been exposed to significantly more, or harder bugs than with C++. There might have even been less bugs, I don't know. At least the bug count or difficulty is not as high as I've been scared to believe, probably because with C there's much less complexity where subtle bugs could hide. There are less possible code paths because of no exceptions. It's not so common to forget to initialize, copy, or move new data members, as designated initialization and built-in assignment are enough for most things. The call stacks are a magnitude smaller. Think about call stacks generated by `std::function`, boost serialization, or containers copying their elements. When something suspicious happens, I'll have the game up and running on Valgrind in less than 10 seconds. Not that Valgrind would solve every memory problem, but often it helps significantly.

##### Minimizing game loading time (5)
We're now approaching the controversy of the unholy trinity, OOP, RAII, and exceptions. I'll first describe what I do with resource and world loading in the new engine.

I process resources to a single binary file from human-readable JSON files. At startup this file is copied to the memory straight from disk. The binary blob consist of a header which describes names and offsets to resource structs. Pointers to variable sized data inside the blob are relative to their own location. I only have to run a single function for things which require initialization, like shaders. Otherwise the resources are loaded and ready to use after reading the file to memory. This is straightforward and ridiculously fast. I should concern myself with data alignment, but that's easy to fix later.

When editing resources in real time using the in-game editor I copy the specific resource data to a separately allocated area and for the variable sized data I allocate separate buffers. This corresponds to the default OOP memory layout, which is fine because I don't have to be fast with single resources, and this code is developer-only. Now when someone asks for a certain resource, he gets back the modified resource, not the original in the blob. This works somewhat transparently, so that when I add a new resource type or new variable sized data members I don't have to remember the allocation details. Editor undo works by memcopying the resource struct and variable sized buffers, and memcopying them back, again in a quite self-contained way. Modified resources are inserted back to the JSON files so that everything else is left untouched, except the fields which were modified, so I keep my indentation, empty lines and, comments. When I start the game next time it'll rebuild the binary blob with the new JSON data. Packing the JSON representation to a blob and converting a resource struct to JSON representation requires two functions per resource type.

The game world is saved mostly with just writing raw memory to disk, although custom serialization and initialization functions can be associated with types that require special care. Versioning would require having to store old struct definitions, but that's not a problem during the (early) development because my game world is procedurally generated. I'm planning to make somewhat automatic struct-conversion with the reflection info. That is, if a new member is added to a struct, the conversion from the old format to the new format can be done automatically. It should be noted, that if the raw memory copy strategy fails for some reason, I can always fall back to writing custom serialization functions, as I would do with C++ by default. It's nice to be able to start with the easiest and the most efficient solution, but still have a reasonable backup plan if I change my mind later.

I have also been experimenting with ideas relying heavily on the separation of data and functions, and found surprisingly simple ways of solving common problems occurring with OOP engine design, especially with game objects. I won't yet preach about them, as I'll have to battle-test them first.

But then, let's see how I'd go with idiomatic C++.

Using the ideas of polymorphism and encapsulation I most likely end up with a solution where each resource class owns its memory, and is probably derived from a common base class. I'm pretty deep in a solution which is hard to optimize later without turning it to a fragile piece of spaghetti code. Although I don't need special handling for editor resources, it's really hard to move from this solution to the efficient C solution incrementally. This worries me. I don't want to worry.

Serialization will be done using a framework-like macro solution, or a templated boost-like thingy. Or maybe some 3rd party solution, like Google Protobuffers. Having to maintain a living object when deserializing can be tricky. Creating or changing datatypes always means manual work. I'm inclined to believe that pretty much everybody agree that C++ doesn't handle serialization well. I bet there are some new language features planned to fix this.



#### Player experience matters
It's both in my creative and technical interest to minimize distractions the player has to confront. I want to make something truly fine quality. That's very different from "good enough". If I wanted to make something "good enough", I'd be using Unity or Unreal engine. I'd be happy using a suboptimal language and making compromises to design due to engine limitations. But I don't do that, because I think it isn't worthwhile to be making something mediocre when I could do better.

An important aspect of maintaining consistent quality is a steady framerate. A game jumping between 30 and 60fps is worse than maintaining a steady 30fps. A 60fps game with a few frames dropping here and there feels cheap. So by "performant" I mean high _and_ stable throughput. That's something GC'd languages haven't achieved.

##### Hiccups
To minimize variance in frame times, I shouldn't be doing things which take unpredictable or highly variable amount of time. This includes calling `malloc`, `new`, `free`, or `delete` during normal gameplay, as they'll occasionally need to call to kernel, which can take as long as the kernel wants or needs.

It isn't good practice to optimize heavy calculations by only performing them rarely. This gives false hope about the maximum frame time, and I'll have occasional hard-to-find hiccups when the probabilities turn up against me and multiple heavy calculations are performed in the same frame. It also makes profiling harder, because my functions don't behave consistently. Instead I should perform the heavy calculations every frame, or divide the load evenly across frames. Sometimes I can upload a task to a separate thread, but that's rarely convenient, and opens up another can of worms.

##### Throughput
The main concern with modern processors is the evergrowing gap between processor and memory performance. If the processor can't predict beforehand what memory it's going to need, it'll have to wait hundreds of cycles for the memory to arrive before continuing execution. This means operating with a large number of separately allocated small pieces of memory is the worst thing I can do performance-wise. Adopting a data-oriented mindset saves me from making this mistake.

C++ is not very suited for data-oriented design, because it's been already iced with idioms, principles, and best practices. The OOP ideas of encapsulation, polymorphism, and ownership originate from the era of a small processor-memory gap. C++ focuses on single, self-contained units of intertwined data and operations, while DoD focuses on the grand scheme of data flow. C++ guides to group data by concept, while DoD guides to group data by operational relevance. A lot of effort can be spent trying to cram these two elephants in the same fridge, although sometimes succesfully. Usually they remain more or less incompatible.

C doesn't have much icing. It's also convenient that the most basic constructs of C -- arrays and loops -- are the basic tools in DoD. Pointers and function pointers have a little dangerous feel to them. That makes me think twice if I really want to use them, and often I don't. While in C++ the default conventions sprinkle pointer overhead and individual allocations everywhere. Think about `std::map`, `std::unordered_map`, virtual functions, `std::function`, and smart pointers. I can avoid them, but constantly making judgement calls implies mental overhead. That is, not having good defaults implies mental overhead.

I also don't want to be doing costly operations willy-nilly. That includes careless mutex locking. So standard dynamic memory allocation is discredited also in this respect.

##### Bottlenecks
Some will surely say that this is a severe case of premature optimization. "Remember the 90/10 rule, optimize the bottlenecks afterwards," they say. But that's what everybody does, and they still have problems with performance. It ignores the real issue, which is code remaining multiple times slower than optimal even after eliminating the low-hanging fruit. If I don't think about performance beforehand, I'll easily end up with a large codebase that is slow everywhere. Death by a million little cuts. This is a huge pain, because now I have to spend time with delicate profiling. Rethinking my data structures and code. Rewriting large parts of the engine from scratch.

This is what happened with my old engine. Everything was fine up until the resource and game object count rised enough. Then I started having performance problems with almost everything: rendering, physics, game object updates, serialization and scripts. I spent weeks optimizing those. Rewriting old code, and writing new, faster algorithms with object pooling. It was better, but still slow as Minecraft. And I had barely started the actual game development. There weren't any functions left taking over 10% of frame time. The solution would've been to rewrite the whole game object system, rewrite the renderer, rewrite the physics wrappings, rewrite the resource system. Rewrite most of the 80kloc codebase with a totally different mindset.

##### No crashing during gameplay
It's reality that my game will have bugs, and most likely crashes too. If I have to crash, I'll want to do it before player has got to playing. This means I should reserve the required memory from OS beforehand, rather than on-demand, so that OOM condition doesn't happen during gameplay. I should also make sure that the reserved virtual address space is backed by physical memory, which can be done by e.g. writing over the allocated blocks.

This of course prevents only one class of crashes, but it's still yet another argument for preallocating the memory.

As a general note, I don't find C inducing more hard-to-find crashes than C++, which is surprising. Sure, I have to be careful when allocating memory to type the correct `sizeof` and count, and that's inconvenient. I have to be careful when writing for-loops that I use the correct max count. With 25kloc there's maybe been a handful of situations where I've messed these up. Incorrect logic still counts for the majority of time spent fixing bugs.

##### Memory management
It should be clear now, that I want full control on handling the memory. To be fair, I don't know enough about specifics of modern processors. I know some useful heuristics originating from DoD, and understand on some level why they work. Based on that, I'd like a handful of different allocation schemes:

- Linear allocation for temporary calculation/storage space. I want to have one of these cleared at the end of every frame, so I can allocate temp memory without worrying allocation overhead. Very useful for cheap temporary strings. This is like no-overhead RAII.
- Pool allocation for contiguous storage of homogeneous data. Sometimes just an array/vector suffices, but becomes inconvenient if I want to have persistent handles to items without indirection. This is more like a container in C, while in C++ I used this as an afterthought per-class optimization.
- Per-thread custom heaps operating in preallocated space. These get rid of the mutex and kernel calling `malloc` has, and can be tweaked further to perform better than any generic heap allocation algorithm.

What I usually do with C to get a custom allocation scheme is to write two functions, alloc and free. In this project I have gone a bit further, and have an allocator info struct for containers to store. These "allocators" work like this:

	// Allocate and free 32 bytes from the standard heap.
	// Tagging will enable handy in-game statistics of memory allocations.
	// Using gen_ator() during the game loop will be detected.
	void *mem = ALLOC(gen_ator(), 32, "tag");
	FREE(gen_ator(), mem);

	// Create a dynamic array in temp space, initial capacity of 32 ints.
	Array(int) arr = create_array(int)(frame_ator(), 32);
	// Give the array to an ordinary function for modification.
	modify_somehow(&arr);
	// Give a "slice" or "view" to someone.
	view_only(arr.data, arr.size);


I have the handy `frame_ator()` for which the allocation is just a pointer increment. I also have `dev_ator()`, which forwards to `malloc`, but is allowed during gameplay. I make use of `realloc`. I've heard there are some nifty techniques relying on separately reserving and committing memory, but I haven't yet got around those things.

I also have to make my own allocators in C++. I don't remember the C++ allocator machinery very well. I've written a few allocators in C++11, and it's a chore. Here's the [mallocator](http://blogs.msdn.com/b/vcblog/archive/2008/08/28/the-mallocator.aspx). That's the simplest thing I'll ever see.

C++ allocators are specified in the container type, not in data. This means I can't give my `std::vector<int, custom_allocator>&` to a function which accepts `std::vector<int>&`. To support different allocators I have to make it a function template. Now the internals of the function have to be exposed in the header, so I need to move `#includes` from .cpp to the .hpp. Catastrophic for compile times. A way to avoid this is to create my own `Slice<T>` for read-only arrays. Now I have one template class more. Maybe I should've just used a raw pointer and a size. For functions which need to modify the container I can keep the definition in the .cpp but instantiate them manually for different combinations of T and A. This hack works, but means more manual work.

With C I have to write at max two functions per allocator, plus a single struct to hold information which allocation method a container instance uses. With C++ I'm easily writing a dozen of class templates and using workarounds to keep my compilation times reasonable. Managing memory is one of the most elementary things there are. C keeps it elementary, C++ doesn't.

#### Reinventing the bumpy weel
Using C prevents me from using a lot of 3rd party code, like most frameworks and the C++ standard library. Shouldn't using premade solutions prevent a lot of frustration and save mental power?

It's true, that there are hard problems, where rolling my own solution would be a lot of work, like physics simulation, compression, or audio/image file decoding. But writing a platform layer, or gluing different minimalistic libraries together is usually not a hard nor a time-consuming problem. I basically have to compare the frustration of writing and maintaining my minimal custom solution to the frustration induced by things like:

- How do I install the build system for this lib on Windows?
- How do I fix the build configuration?
- Why doesn't this build on this compiler?
- Why did this break after updating this compiler?
- How to work around this bug manifesting on this compiler, platform and this optimization level?
- This lib requires disabling some compiler warnings.
- Why does this platform lib crash when trying to open a full screen window on two-monitor computer?
- Why doesn't this platform lib handle cursor hiding the way I want?
- Or is this a bug? The documentation doesn't say.
- Will bad things happen if I remove this probably stale assert?
- How can I add an alpha-blended hardware cursor support to this platform lib that was advertised to "do it all for me"?
- Now I'm figuring out a large codebase where most of the architecture and implementation is related to stuff I don't need.
- Why does this audio lib read files/allocate memory/lock mutexes inside the critical audio loop?
- Is this issue a signal for incompetency of the developers, or just an innocent temp solution?
- Could the random crash be related to this lib, since the quality seems to leave a lot to be desired?
- This scripting language does something subtle, but unforeseenly stupid. Like destructs things in the same order it constructs.
- I'm now arguing with the developers whether this is an issue or not.
- I'm now maintaing my own branch of the lib.
- Hmm. The game misbehaves after I updated the lib for some bug fixes. Oh, it's an undocumented change.

Phew, I feel better now.

I think it's time for me to learn from my mistakes. Therefore I rather use minimalistic libraries, which solve very specific hard problems, written by people with expertise in their area. Gluing those libraries to the engine can surely be worth the effort. Replacing a minimal library is a realistic option if the hell breaks loose. Replacing a framework takes days, weeks, or even months. By minimizing third-party code I also minimize the possibility of me pulling my hair off due to mistakes of others. It should be their bold spreading, not mine. Or maybe it's my fault because I didn't audit their library properly. But with that time I could almost have written the thing myself.

The sweet spot is somewhere near the "be very sceptic of which libraries to add as dependencies" and far away from the "be happy when someone provides almost the thing you need." If building a library requires a build system, it's a bad sign. It suggests that the developer doesn't appreciate simplicity or the user enough. That's the proper level of scepticism.

Well, what about the C++ standard library?

I've found it to be "almost the thing I need", which is a shame. Some problems with it are `std::vector` bloating compile and link times, `std::unordered_map` allocating every item individually, and custom allocators being tricky to manufacture and use. So the three things that I need the most of it are just not good.

It should be noted that building my own containers in C is not so much work as it sounds. A type-safe dynamic array I wrote is about 100 lines. A hash map is a bit more. Much of the headache associated with container code is due to constructing, destructing, copying and moving elements in an exception-safe manner, which is indeed tricky to get right.

I don't need dozens of containers nor algorithms, not many besides a dynamic array, hash map, `qsort` and `bsearch`. More sophisticated containers I'd want are also missing from C++. Yes, C sort and search are not as fast as the C++ equivalents, but at least the inefficiency is contained within a single line of code, which is relatively easy to replace if it ever becomes a performance problem. So I don't have to worry much about it.

For the record, making good libraries is hard. Not sure if I can make one. Making code which is good for the specific problem of mine is much easier. That I can make, and most of the time even enjoy.

#### Maintainability
Data-orientedness is not about scrambling some "ordinary" code to be optimal. It's about organizing your program using a different mindset. DoD is closer to hardware than OOP, but it doesn't outright lead to unmaintainable code. DoD doesn't necessarily mean more code.

The 25kloc of my new engine implements over half of the big features I had in the old 80kloc engine, and with significantly better performance. Most of the reduced code accounts for figuring out better solutions to problems. Experience has its role, but the C++ way of doing things would outright prevent some of the simple solutions in my new engine.

I don't anymore believe OOP to be the pinnacle of maintainability. I believe that if you know how to write maintainable code, you can do it without the training wheels of OOP. You know that when you start to poke a variable from too many places, a better solution should be made up. You know intuitively how to maintain simplicity in your codebase, whether it's OOP, procedural, or functional. And you have the discipline.

I also understand that many programmers don't have this intuition, and that there can be strange psychological group effects going on with a larger group of programmers. Training wheels are sometimes needed in the real world. Those issues are not a concern for me as I'm the only programmer in this project. That might sound short-sighted, but I think of it this way: There may be some mediocre programmers wanting to help, but practically all the good programmers have their own projects and ambitions. That is, the ones who I'd like to write the code for me, won't.

#### Error handling
I've found it rather simple and effective to handle most of the exceptional situations with an error message, combined with an `abort()`. Usually there is no reasonable way to re-try an action, and the exceptional situation should be treated as a bug, fixed before shipping. When there is, error codes have been manageable. With error codes I mostly need to tell the compiler to warn me if I don't use the return value. Error codes don't pierce my whole codebase, nor the call stack, they're local. They're not ideal, but at least they're simple.

The C++ exceptions can't be considered simple, as they require an array of rules and best practices to write bug-free code with. I understand that exceptions seem handy when your call stacks are 50 frames tall. With the correct mindset and rules in place they work, but it's still some scary stuff. Read [the hundred GotW articles](http://herbsutter.com/gotw/) if you aren't scared of C++ yet.

When I refuse OOP, RAII, and exceptions, I have saved a lot of mental power and code flexibility to direct towards solving the problems of the actual engine development. That can be really valuable. Getting free of shackles is refreshing.

#### Misc. language features

There are some smaller issues left.

Namespaces have some good arguments for them. They reduce name collisions and allow shorter names. But game engines are fairly self-contained codebases. I use short names, because I know decent libraries prefix their names, and my code isn't likely to be used as a part of some other codebase. Therefore there's only little value to be gained from namespaces. In fact, the value could even be negative, because they'd make writing the Quick & Dirty reflection, well, not-quick.

I don't miss smart pointers much. It's pretty clear which system owns which data. There's not too much recursion going on with datatypes inside datatypes. Valgrind tells me if an allocation was not freed, or was used after freeing.

Templates are another controversial topic. Huge compile and link times, but sometimes they're convenient. With C I've found macros like this to be possible to live with:

	DECLARE_ARRAY(int) // In .h
	DEFINE_ARRAY(int) // In .c
	...
	// Use the linear frame allocator, initial capacity of 10 elements
	Array(int) arr = create_array(int)(frame_ator(), 10);
	push_array(int)(&arr, 95);
	debug_print("First element: %i, size: %i", arr.data[0], arr.size);

I don't have template metaprogramming in C. I'm not sad, because the reflection mostly covers the legitimate use cases I had for it in C++, like the need for SFINAE and type inspection with partial specializations. I don't get expression templates to speed up matrix calculations, but that is again a local thing, meaning that I can generate the code needed for it later if necessary. With expression templates I spend a lot of time writing the template system and also pay in compile times.

Operator overloading is convenient with maths. It makes finding a function pointer at run-time hard though, so I don't wish C had it. Or maybe I wish, if it worked with function names like `Vec2f_plus_Vec2f` and not some mangled garbage. An ideal language would have both operator overloading and proper reflection.

Argument overloading shares the same name mangling problems. It would be convenient to have in some situations. Name lookup, template argument deduction, overload resolution, access control, virtual functions and shadowing rules are overly complex in C++ though. Just watch STL (the guy) spending [eight hours in his Core C++ series](https://youtu.be/3Yg3QnGXxHM) explaining how all that machinery works. After that it doesn't feel so bad that C forces me to be explicit, although it's occasionally inconvenient.

`auto`-keyword is handy if I have long type names, like `std::vector<foo::bar,`
`core::some_allocator>::iterator`, or generic code. However, too generous use of it will make the code hard to read, because now I have to figure out myself what the return types of functions are. I haven't been missing it, because I don't have overly verbose type names, because I don't have to worry about name collisions. My dynamic array is just `Array(Type)`, and iteration works through `Type*` or `U32` regardless of the allocator used. The little amount of generic code is dead simple. I understand the need for `auto` in C++ though.

C++ also has some features which are required to make the system self-consistent, but are more or less useless outside of it, like reference semantics, and copy and move semantics.

In C I usually carry out the rule of zero: added members are automatically initialized to zero and copied/moved with the struct. Sometimes I have the rule of one: allocate temporary memory/handle which is automatically copied/moved and freed. Handy, but also fast. At worst I have the rule of two: when I create something, I should also remember to destroy it. Sometimes this is mildly inconvenient. I never have the C++11 rule of [_five_](http://en.cppreference.com/w/cpp/language/rule_of_three). With the rule of _five_ I have _five_ places to change, or at least to think about when I add a new member. Well, more often three, as copying objects is not so common. I don't want to be causing subtle bugs by forgetting copying or moving the new member, so I'll write a bunch of templated utility classes which implement the desired semantics. Then I don't have to write custom copys or moves for larger classes. Except in some corner cases, like when a member `std::function` is capturing `this`. Using templated utility classes is elegant in the C++ mindset, as they make perfect semantic sense. But now my builds crawl. There's no way I can beat the system.

#### Conclusions
I'll now list separately how C, C++, and C/C++ make fitting my ideals hard. Critique of C and C++ is done in the context of their respective philosophies, while C/C++ tries to be something in between, whatever that means. Note that every competing option means increased mental overhead, especially when there's no particularly good solution available. I won't list all deficiencies shared among the languages.

##### C(99)
- I have to write my own containers.
- I have to write my own allocation mechanisms.
- I have to choose between writing duplicated code, writing a code generator, or tedious macro stuff for generic code.
- C lacks expressivity, but gives simplicity. Not in the ideal proportion though.
- More code to write? Maybe, maybe not.
- More memory bugs? This seems plausible, but I can't confirm it. Better debuggability weights a lot in the opposite direction.
- MSVC support for C99 used to be bad, but it seems like they have fixed the non-standard snprintf, added compound literals and designated initializers. C89 is always a widely supported option though, but it's less convenient to write.

##### C++(11)
- Allocator insanity. A lot worse situation than in C.
- Lousy containers, but rolling my own requires a lot more work than in C.
- I don't get the Quick & Dirty reflection. I don't get a real-time data viewer without huge effort.
- Debug build is slow at startup, and slow in-game. Need to profile and optimize that.
- I feel bad for optimizing, because the code smells now.
- I feel bad for not optimizing enough, because the game runs poorly.
- Debug build is unplayably slow when running in Valgrind. Also takes ages to start.
- Rebuilding is slow. Incremental builds are slow. Is it worth to optimize the build or not?
- I have to perform a dozen tricks to optimize build times. Still slow compared to C.
- OOP clashes with data-oriented design. Cognitive dissonance.
- RAII is [far](https://groups.google.com/a/chromium.org/forum/#!msg/chromium-dev/EUqoIz2iFU4/kPZ5ZK0K3gEJ) from optimal.
- Constant mental overhead of exception safety.
- A lot of code for copy and move semantics.
- Not having good defaults causes mental overhead in the form of the tradeoff game.
- I should keep up with the massive body of C++ knowledge to know when the previous best practices are replaced with new and better ones.
- My mental cache is filled with language problems, not the actual problems I'd like to solve.

##### C/C++
- I'll get to play the tradeoff game at expert level. OOP vs. procedural. Member function vs. free function. RAII vs. manual. Exceptions vs. error codes. Templates vs. macros. C vs. C++ standard library. Bare vs. smart. Array vs. vector. Fast vs. slow compilation. Fast vs. slow debug builds.
- I don't get the editor powered by Quick & Dirty reflection. I get a dirty solution at best, with new and meaningless tradeoff games. Overloading vs. unique names. Objects vs. structs. Templates/namespaces vs. simple scanner.
- The codebase has two competing programming languages intertwined. Juggling with contradictory philosophies is tiresome and error-prone.
- No handy compound literals or designated initializers from C99.
- I have to keep both C and C++ knowledge in my head.
- I'll have to pick the rest of my poison from both C and C++.

And so I chose C. I'm still in the figuring-out stage, but after 25kloc I haven't yet regretted. In fact, I've found ways to eliminate most of the headaches I had with C++, while introducing only few new ones. I've found more simplicity, efficiency, and elegancy in the separation of data and operations than I could've believed. 
