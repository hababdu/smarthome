import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Backend manzili: telefon va server bir Wi-Fi da bo'lsa kompyuter IP si.
/// Android emulyatorida: http://10.0.2.2:3000
const String kBaseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');
const String kToken = String.fromEnvironment('API_TOKEN', defaultValue: 'change-me');

class Device {
  final String id, room, kind;
  final Map<String, dynamic> name;
  final bool on, online, essential;
  final double watts, ratedWatts;
  Device(this.id, this.room, this.kind, this.name, this.on, this.online, this.essential, this.watts, this.ratedWatts);

  factory Device.fromJson(Map<String, dynamic> j) => Device(
        j['id'], j['room'], j['kind'], j['name'],
        j['on'] == true, j['online'] == true, j['essential'] == true,
        (j['watts'] ?? 0).toDouble(), (j['ratedWatts'] ?? 0).toDouble(),
      );
  Device copyWith({bool? on, double? watts, bool? online}) =>
      Device(id, room, kind, name, on ?? this.on, online ?? this.online, essential, watts ?? this.watts, ratedWatts);
}

class Room {
  final String id;
  final Map<String, dynamic> name;
  Room(this.id, this.name);
}

class Alert {
  final String message, level;
  Alert(this.message, this.level);
}

class Api {
  final _h = {'Authorization': 'Bearer $kToken', 'Content-Type': 'application/json'};
  Uri _u(String p, [Map<String, String>? q]) => Uri.parse('$kBaseUrl$p').replace(queryParameters: q);

  Future<Map<String, dynamic>> home() async =>
      jsonDecode((await http.get(_u('/api/home'), headers: _h)).body);

  Future<void> power(String id, bool on) =>
      http.post(_u('/api/devices/$id/power'), headers: _h, body: jsonEncode({'on': on}));

  Future<Map<String, dynamic>> energy(String lang) async =>
      jsonDecode((await http.get(_u('/api/energy', {'lang': lang}), headers: _h)).body);

  Future<List<dynamic>> scenes() async =>
      jsonDecode((await http.get(_u('/api/scenes'), headers: _h)).body);

  Future<void> runScene(String id) => http.post(_u('/api/scenes/$id/run'), headers: _h);

  /// Ovozdan olingan matnni backend NLU ga yuboradi.
  Future<Map<String, dynamic>> voice(String text) async => jsonDecode(utf8.decode(
      (await http.post(_u('/api/voice'), headers: _h, body: jsonEncode({'text': text}))).bodyBytes));

  /// Real-vaqt yangilanishlar (holat, ogohlantirishlar).
  WebSocketChannel live() => WebSocketChannel.connect(
      Uri.parse('${kBaseUrl.replaceFirst('http', 'ws')}/ws?token=$kToken'));
}
