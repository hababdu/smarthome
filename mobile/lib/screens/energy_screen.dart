import 'package:flutter/material.dart';
import '../services/api.dart';

const _accent = Color(0xFFF07837);
const _muted = Color(0xFF9CA3AF);

class EnergyScreen extends StatefulWidget {
  final Api api;
  const EnergyScreen({super.key, required this.api});
  @override
  State<EnergyScreen> createState() => _EnergyScreenState();
}

class _EnergyScreenState extends State<EnergyScreen> {
  String period = 'week';
  late Future<Map<String, dynamic>> future;
  @override
  void initState() { super.initState(); future = widget.api.energy('uz'); }
  void refresh() => setState(() => future = widget.api.energy('uz'));

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: future,
    builder: (context, snap) {
      if (snap.hasError) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('Xato: ${snap.error}')));
      if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: _accent));
      final e = snap.data!;
      final data = Map<String, dynamic>.from(e[period == 'year' ? 'month' : period]);
      final entries = Map<String, dynamic>.from(data['perDevice'] ?? {}).entries.toList()..sort((a,b)=>(b.value as num).compareTo(a.value as num));
      final maxV = entries.isEmpty ? 1.0 : (entries.first.value as num).toDouble().clamp(.001, double.infinity);
      final totalCost = (data['cost'] as num?)?.toDouble() ?? 0;
      return RefreshIndicator(color: _accent, onRefresh: () async => refresh(), child: ListView(padding: const EdgeInsets.fromLTRB(16, 14, 16, 120), children: [
        Row(children: [const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Energy Usage', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)), SizedBox(height: 4), Text('Uy energiyasi statistikasi', style: TextStyle(color: _muted, fontSize: 11))])), IconButton(onPressed: refresh, icon: const Icon(Icons.calendar_month_outlined))]),
        const SizedBox(height: 8), Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: const Color(0xFF20232D), borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.white10)), child: Row(children: [for(final p in [('day','Kun'),('week','Hafta'),('month','Oy'),('year','Yil')]) Expanded(child: InkWell(borderRadius: BorderRadius.circular(30), onTap: () => setState(() => period = p.$1), child: Container(padding: const EdgeInsets.symmetric(vertical: 9), decoration: BoxDecoration(color: period == p.$1 ? _accent : Colors.transparent, borderRadius: BorderRadius.circular(30)), child: Text(p.$2, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: period == p.$1 ? Colors.white : _muted, fontWeight: FontWeight.w600)))))])),
        const SizedBox(height: 12), Row(children: [Expanded(child: _stat('Jami sarf', period == 'year' ? '—' : '${(data['kwh'] as num).toStringAsFixed(1)}', 'kWh', Icons.bolt_outlined)), const SizedBox(width: 9), Expanded(child: _stat('Jami xarajat', period == 'year' ? '—' : totalCost.toStringAsFixed(0), 'so‘m', Icons.attach_money))]),
        const SizedBox(height: 14), Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFF20232D), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white10)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Usage Overview', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), const SizedBox(height: 15), if (period == 'year') const SizedBox(height: 90, child: Center(child: Text('Yillik ma’lumotlar hali yetarli emas', style: TextStyle(color: _muted, fontSize: 11)))) else if(entries.isEmpty) const SizedBox(height: 90, child: Center(child: Text('Hozircha ma’lumot yo‘q', style: TextStyle(color: _muted, fontSize: 11)))) else SizedBox(height: 150, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [for(final item in entries.take(7)) Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [Expanded(child: Align(alignment: Alignment.bottomCenter, child: Container(width: 15, height: 110 * ((item.value as num).toDouble() / maxV).clamp(.06, 1.0), decoration: BoxDecoration(color: item == entries.first ? _accent : const Color(0xFFB7B9C0), borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))))), const SizedBox(height: 7), Text(item.key.replaceAll('-', '\n'), maxLines: 2, textAlign: TextAlign.center, style: const TextStyle(color: _muted, fontSize: 8, height: 1.1))])))])), const SizedBox(height: 4), const Text('Qurilmalar bo‘yicha qayd etilgan sarf', style: TextStyle(color: _muted, fontSize: 9))])),
        const SizedBox(height: 13), Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFF20232D), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white10)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Top Energy Consumers', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), const SizedBox(height: 14), for(final item in entries.take(5)) Padding(padding: const EdgeInsets.only(bottom: 14), child: Row(children: [Container(width:30,height:30,decoration:BoxDecoration(color:const Color(0xFF2B2E38),borderRadius:BorderRadius.circular(10)),child:const Icon(Icons.bolt,size:16,color:_muted)),const SizedBox(width:9),Expanded(child:Column(children:[Row(children:[Expanded(child:Text(item.key.replaceAll('-', ' '),style:const TextStyle(fontSize:10,fontWeight:FontWeight.w600),overflow:TextOverflow.ellipsis)),Text('${(item.value as num).toStringAsFixed(1)} kWh',style:const TextStyle(fontSize:9,color:_muted))]),const SizedBox(height:6),ClipRRect(borderRadius:BorderRadius.circular(9),child:LinearProgressIndicator(value:((item.value as num).toDouble()/maxV).clamp(0.0, 1.0).toDouble(),minHeight:3,color:_accent,backgroundColor:Colors.white10))])),const SizedBox(width:8),Text('${((item.value as num).toDouble()/entries.fold<double>(0,(sum,x)=>sum+(x.value as num).toDouble()).clamp(.01,double.infinity)*100).round()}%',style:const TextStyle(fontSize:9,color:_muted))]))])),
        const SizedBox(height:12), Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFF20232D), borderRadius: BorderRadius.circular(17), border: Border.all(color: Colors.white10)), child: Row(children: [const CircleAvatar(backgroundColor:Color(0x24F07837),child:Icon(Icons.attach_money,color:_accent)),const SizedBox(width:10),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Elektr tarifi',style:TextStyle(fontSize:11,fontWeight:FontWeight.w700)),Text('${e['tariff']} so‘m/kWh',style:const TextStyle(color:_muted,fontSize:10))])),const Icon(Icons.chevron_right,color:_muted)])),
        if ((e['tips'] as List?)?.isNotEmpty == true) ...[const SizedBox(height:12), Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:const Color(0xFF1F2D2A),borderRadius:BorderRadius.circular(16)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Tejash tavsiyalari',style:TextStyle(color:Color(0xFF69D99C),fontWeight:FontWeight.w700,fontSize:12)),for(final tip in (e['tips'] as List).take(2)) Padding(padding:const EdgeInsets.only(top:7),child:Text('• $tip',style:const TextStyle(color:_muted,fontSize:10))) ]))]
      ]));
    },
  );

  Widget _stat(String title,String value,String unit,IconData icon)=>Container(padding:const EdgeInsets.all(13),decoration:BoxDecoration(color:const Color(0xFF20232D),borderRadius:BorderRadius.circular(16),border:Border.all(color:Colors.white10)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[Expanded(child:Text(title,style:const TextStyle(color:_muted,fontSize:10))),Icon(icon,size:15,color:_accent)]),const SizedBox(height:9),Text(value,style:const TextStyle(fontSize:20,fontWeight:FontWeight.w800)),Text(unit,style:const TextStyle(color:_muted,fontSize:9))]));
}
