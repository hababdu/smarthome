import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api.dart';

const _orange = Color(0xFFF07837);
const _muted = Color(0xFF9CA3AF);

class HomeScreen extends StatefulWidget {
  final Api api;
  const HomeScreen({super.key, required this.api});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Room> rooms = [];
  Map<String, Device> devices = {};
  int total = 0;
  Alert? alert;
  String? error;
  StreamSubscription? _sub;

  @override
  void initState() { super.initState(); _load(); _connect(); }

  Future<void> _load() async {
    try { final j = await widget.api.home(); _apply(j); }
    catch (e) { if (mounted) setState(() => error = 'Serverga ulanib bo\'lmadi: $e'); }
  }

  void _apply(Map<String, dynamic> j) {
    if (!mounted) return;
    setState(() {
      error = null;
      rooms = (j['rooms'] as List).map((r) => Room(r['id'], r['name'])).toList();
      devices = {for (final d in j['devices']) d['id']: Device.fromJson(d)};
      total = (j['totalWatts'] ?? 0).round();
    });
  }

  Future<void> _connect() async {
    try {
      final ch = await widget.api.live().timeout(const Duration(seconds: 12));
      if (!mounted) { await ch.sink.close(); return; }
      _sub = ch.stream.listen((raw) {
        final m = jsonDecode(raw as String);
        switch (m['type']) {
          case 'snapshot': _apply(m); break;
          case 'state':
            final d = devices[m['id']]; if (d == null) return;
            final s = m['state'];
            setState(() { devices[d.id] = d.copyWith(on: s['on'], watts: (s['watts'] ?? 0).toDouble(), online: s['online']); total = devices.values.fold(0.0, (a, x) => a + (x.on ? x.watts : 0)).round(); });
            break;
          case 'alert': setState(() => alert = Alert(m['message'], m['level'])); break;
        }
      }, onError: (Object e) { if (mounted) setState(() => error = 'Jonli ulanish uzildi: $e'); }, onDone: () => Future.delayed(const Duration(seconds: 3), () { if (mounted) _connect(); }));
    } catch (e) { if (mounted) setState(() => error = 'Jonli ulanishda xatolik: $e'); Future.delayed(const Duration(seconds: 5), () { if (mounted) _connect(); }); }
  }

  @override
  void dispose() { _sub?.cancel(); super.dispose(); }

  String _name(Device d) => (d.name['uz'] ?? d.name['ru'] ?? d.id).toString();
  IconData _icon(Device d) => switch (d.kind) { 'light' => Icons.lightbulb_outline, 'tv' => Icons.tv, 'iron' => Icons.iron_outlined, 'coffee' => Icons.coffee_outlined, 'fridge' => Icons.kitchen_outlined, _ => Icons.power_outlined };

  Future<void> _toggle(Device d, bool value) async {
    try { await widget.api.power(d.id, value); if (mounted) setState(() => error = 'Buyruq yuborildi, qurilma tasdig‘i kutilmoqda.'); }
    catch (e) { if (mounted) setState(() => error = 'Buyruq bajarilmadi: $e'); await _load(); }
  }

  Future<void> _scene(String id) async {
    try { await widget.api.runScene(id); if (mounted) setState(() => error = 'Ssenariy buyrug‘i yuborildi. Qurilmalar holati tasdiqlanmoqda.'); }
    catch (e) { if (mounted) setState(() => error = 'Ssenariyni bajarib bo‘lmadi: $e'); }
  }

  void _openDetails(Device d) {
    int brightness = 80; String mode = 'Sovuq'; bool timer = false;
    showModalBottomSheet<void>(context: context, isScrollControlled: true, backgroundColor: const Color(0xFF202127), shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))), builder: (context) => StatefulBuilder(builder: (context, setSheet) => SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(20, 12, 20, 26), child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 38,height: 4,decoration:BoxDecoration(color:Colors.white24,borderRadius:BorderRadius.circular(8))),
      const SizedBox(height:18), Row(children:[IconButton(onPressed:()=>Navigator.pop(context),icon:const Icon(Icons.arrow_back)),Expanded(child:Column(children:[Text(_name(d),style:const TextStyle(fontWeight:FontWeight.w700,fontSize:16)),const SizedBox(height:3),Text('Qurilma boshqaruvi',style:TextStyle(color:Colors.white.withValues(alpha:.5),fontSize:11))])),const Icon(Icons.settings_outlined)]),
      Container(height:190,width:double.infinity,margin:const EdgeInsets.symmetric(vertical:14),decoration:BoxDecoration(borderRadius:BorderRadius.circular(22),gradient:const RadialGradient(colors:[Color(0xFF41434A),Color(0xFF24262C),Color(0xFF191A1F)])),child:Icon(_icon(d),size:94,color:const Color(0xFFFFD8AD))),
      Row(children:[Expanded(child:_detailControl(Icons.power,'Quvvat',d.on?'Yoqilgan':'O‘chiq',()=>_toggle(d,!d.on))),const SizedBox(width:10),Expanded(child:_detailControl(Icons.wb_sunny_outlined,'Yorqinlik','$brightness%',null))]),
      const SizedBox(height:14),Container(padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:const Color(0xFF292B32),borderRadius:BorderRadius.circular(18)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[const Icon(Icons.wb_sunny_outlined,size:17),const SizedBox(width:8),const Expanded(child:Text('Yorqinlik darajasi',style:TextStyle(fontSize:12))),Text('$brightness%',style:const TextStyle(color:_orange,fontSize:12,fontWeight:FontWeight.w700))]),SliderTheme(data:SliderTheme.of(context).copyWith(activeTrackColor:_orange,thumbColor:Colors.white,inactiveTrackColor:Colors.white12),child:Slider(value:brightness.toDouble(),min:0,max:100,onChanged:(v)=>setSheet(()=>brightness=v.round()))),Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[Icon(Icons.wb_sunny_outlined,size:14,color:Colors.white54),Icon(Icons.wb_sunny,size:19,color:Colors.white54)])])),
      const SizedBox(height:14),Align(alignment:Alignment.centerLeft,child:Text('Yorug‘lik rejimi',style:TextStyle(fontSize:12,fontWeight:FontWeight.w700))),const SizedBox(height:10),Row(children:[for(final item in [('Iliq','3000K'),('Neytral','4000K'),('Sovuq','6000K')]) Expanded(child:Padding(padding:const EdgeInsets.only(right:6),child:InkWell(onTap:()=>setSheet(()=>mode=item.$1),child:Container(padding:const EdgeInsets.symmetric(vertical:11,horizontal:5),decoration:BoxDecoration(color:mode==item.$1?_orange:const Color(0xFF292B32),borderRadius:BorderRadius.circular(13),border:Border.all(color:mode==item.$1?_orange:Colors.white10)),child:Column(children:[Icon(Icons.wb_sunny_outlined,color:mode==item.$1?Colors.white:const Color(0xFFFFB45D),size:17),const SizedBox(height:5),Text(item.$1,style:const TextStyle(fontSize:10,fontWeight:FontWeight.w600)),Text(item.$2,style:const TextStyle(fontSize:9))]))))) ]),
      const SizedBox(height:12),InkWell(onTap:()=>setSheet(()=>timer=!timer),child:Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:const Color(0xFF292B32),borderRadius:BorderRadius.circular(15)),child:Row(children:[const Icon(Icons.timer_outlined),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Taymer',style:TextStyle(fontSize:10,color:_muted)),Text(timer?'02:30:00':'O‘chiq',style:const TextStyle(fontSize:12,color:_orange,fontWeight:FontWeight.w600))])),const Icon(Icons.chevron_right)]))),
      const SizedBox(height:10),Text('Yorqinlik va rang rejimi qurilma qo‘llab-quvvatlasa, real qurilmaga uzatilishi kerak.',style:TextStyle(color:Colors.white.withValues(alpha:.42),fontSize:10))
    ]))))));
  }

  Widget _detailControl(IconData icon,String title,String value,VoidCallback? action) => InkWell(onTap:action,child:Container(padding:const EdgeInsets.all(13),decoration:BoxDecoration(color:const Color(0xFF292B32),borderRadius:BorderRadius.circular(15)),child:Row(children:[Icon(icon,size:20),const SizedBox(width:10),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:9,color:_muted)),Text(value,style:const TextStyle(fontSize:12,color:_orange,fontWeight:FontWeight.w700))]))])));

  @override
  Widget build(BuildContext context) {
    final all = devices.values.toList(); final featured = all.take(4).toList(); final active = all.where((d)=>d.on).length;
    return RefreshIndicator(onRefresh:_load,child:ListView(padding:const EdgeInsets.fromLTRB(16,14,16,120),children:[
      Row(children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Xayrli tong,',style:TextStyle(color:Theme.of(context).colorScheme.onSurfaceVariant,fontSize:11)),const Text('Michael',style:TextStyle(fontSize:21,fontWeight:FontWeight.w700)),const SizedBox(height:7),InkWell(onTap:()=>ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Uy ko‘rinishi ochiladi'))),child:const Row(mainAxisSize:MainAxisSize.min,children:[Text('My Home',style:TextStyle(fontSize:13,fontWeight:FontWeight.w600)),Icon(Icons.keyboard_arrow_down,size:16)]))])),const CircleAvatar(backgroundColor:Color(0xFF35333A),child:Text('M',style:TextStyle(color:Colors.white,fontWeight:FontWeight.w700)))]),
      const SizedBox(height:17),Row(children:[_category('Barchasi',Icons.grid_view,true),_category('Chiroqlar',Icons.lightbulb_outline,false),_category('Xavfsizlik',Icons.shield_outlined,false),_category('Iqlim',Icons.nightlight_round,false)]),
      const SizedBox(height:21),_sectionTitle('Sevimli qurilmalar'),const SizedBox(height:10),GridView.builder(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),itemCount:featured.length,gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:2,mainAxisSpacing:10,crossAxisSpacing:10,childAspectRatio:.98),itemBuilder:(context,i)=>_favoriteCard(featured[i])),
      const SizedBox(height:20),_sectionTitle('Tezkor amallar'),const SizedBox(height:10),Row(children:[_quick('Xayrli tun',Icons.nightlight_round,'good_night',const Color(0xFFB5A8FF)),_quick('Uydan tashqari',Icons.shield_outlined,'leave_home',_muted),_quick('Tejamkorlik',Icons.eco_outlined,'all_off',const Color(0xFF69D99C)),_quick('Bayram',Icons.celebration_outlined,'evening',_orange)]),
      const SizedBox(height:18),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:const Color(0xFF20232D),borderRadius:BorderRadius.circular(19),border:Border.all(color:Colors.white10)),child:Column(children:[Row(children:[const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Energiya sarfi',style:TextStyle(fontWeight:FontWeight.w700,fontSize:12)),SizedBox(height:4),Text('Joriy quvvat',style:TextStyle(color:_muted,fontSize:10))])),Text('${(total/1000).toStringAsFixed(2)} kW',style:const TextStyle(fontWeight:FontWeight.w700,fontSize:21))]),const SizedBox(height:13),ClipRRect(borderRadius:BorderRadius.circular(20),child:LinearProgressIndicator(value:(total/7000).clamp(0,1).toDouble(),minHeight:6,backgroundColor:Colors.white12,color:_orange)),const SizedBox(height:7),Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[Text('Yuklama ${(total/7000*100).round()}%',style:const TextStyle(color:_muted,fontSize:10)),const Text('7 kW',style:TextStyle(color:_muted,fontSize:10))])])),
      const SizedBox(height:19),_sectionTitle('Xonalar · $active/${all.length} faol'),const SizedBox(height:8),...rooms.map((r){final list=all.where((d)=>d.room==r.id).toList();return Container(margin:const EdgeInsets.only(bottom:8),decoration:BoxDecoration(color:const Color(0xFF20232D),borderRadius:BorderRadius.circular(15),border:Border.all(color:Colors.white10)),child:ListTile(leading:const CircleAvatar(backgroundColor:Color(0xFF2C2F3A),child:Icon(Icons.meeting_room_outlined,color:Color(0xFFB8A4FF))),title:Text((r.name['uz']??r.id).toString(),style:const TextStyle(fontSize:12,fontWeight:FontWeight.w600)),subtitle:Text('${list.length} qurilma · ${list.where((d)=>d.on).length} faol',style:const TextStyle(color:_muted,fontSize:10)),trailing:const Icon(Icons.chevron_right,color:_muted,size:18),onTap:()=>list.isNotEmpty?_openDetails(list.first):null));}),
      if(error!=null)Padding(padding:const EdgeInsets.only(top:10),child:Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error,fontSize:11))),
      if(alert!=null)Card(color:Theme.of(context).colorScheme.errorContainer,child:ListTile(leading:const Icon(Icons.warning_amber),title:Text(alert!.message,style:const TextStyle(fontSize:12)),trailing:IconButton(onPressed:()=>setState(()=>alert=null),icon:const Icon(Icons.close)))),
    ]));
  }

  Widget _category(String label,IconData icon,bool active)=>Expanded(child:Container(height:62,margin:const EdgeInsets.only(right:6),decoration:BoxDecoration(color:active?const Color(0xFF3A2A25):const Color(0xFF20232D),borderRadius:BorderRadius.circular(14),border:Border.all(color:active?_orange.withValues(alpha:.35):Colors.white10)),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(icon,size:17,color:active?_orange:_muted),const SizedBox(height:5),Text(label,style:TextStyle(fontSize:9,color:active?_orange:_muted),overflow:TextOverflow.ellipsis)])));
  Widget _sectionTitle(String title)=>Row(children:[Expanded(child:Text(title,style:const TextStyle(fontSize:13,fontWeight:FontWeight.w700))),const Icon(Icons.more_vert,size:17,color:_muted)]);
  Widget _favoriteCard(Device d){final on=d.on;return InkWell(onTap:()=>_openDetails(d),borderRadius:BorderRadius.circular(17),child:Container(padding:const EdgeInsets.all(11),decoration:BoxDecoration(color:const Color(0xFF20232D),borderRadius:BorderRadius.circular(17),border:Border.all(color:Colors.white10)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[Expanded(child:Text(_name(d),style:const TextStyle(fontSize:11,fontWeight:FontWeight.w700),maxLines:1,overflow:TextOverflow.ellipsis)),const Icon(Icons.more_vert,size:14,color:_muted)]),Text((rooms.where((r)=>r.id==d.room).isNotEmpty ? (rooms.where((r)=>r.id==d.room).first.name['uz'] ?? 'Uy').toString() : 'Uy'),style:const TextStyle(fontSize:9,color:_muted)),Expanded(child:Center(child:Icon(_icon(d),size:56,color:on?const Color(0xFFFFD2A4):const Color(0xFF7C818B)))),Row(children:[Expanded(child:Text(!d.online?'Oflayn':on?'${d.watts.round()} W':'O‘chiq',style:TextStyle(fontSize:9,color:on?_orange:_muted))),Switch.adaptive(value:on,onChanged:d.online&&!d.essential?(v)=>_toggle(d,v):null,activeColor:_orange,materialTapTargetSize:MaterialTapTargetSize.shrinkWrap)] )])));}
  Widget _quick(String title,IconData icon,String scene,Color color)=>Expanded(child:Padding(padding:const EdgeInsets.only(right:6),child:InkWell(onTap:()=>_scene(scene),borderRadius:BorderRadius.circular(13),child:Container(height:70,decoration:BoxDecoration(color:const Color(0xFF20232D),borderRadius:BorderRadius.circular(13),border:Border.all(color:Colors.white10)),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(icon,size:18,color:color),const SizedBox(height:7),Padding(padding:const EdgeInsets.symmetric(horizontal:2),child:Text(title,style:const TextStyle(fontSize:8),textAlign:TextAlign.center,maxLines:2))])))));
}
